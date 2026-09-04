(function(){var e=`# Copyright 2014 Google Inc. All rights reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
# http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

from causalimpact.__version__ import __version__
from causalimpact.main import CausalImpact
`,t=`# Copyright 2014 Google Inc. All rights reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
# http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

VERSION = (0, 1, 1)

__version__ = '.'.join([str(e) for e in VERSION])
`,n=`# Copyright 2014 Google Inc. All rights reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
# http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""
Computes posterior inferences related to post-intervention period of a time series
based model.
"""


from __future__ import absolute_import, division, print_function

import numpy as np
import pandas as pd

from causalimpact.misc import get_reference_model, get_z_score, unstandardize


class Inferences(object):
    """
    All computations related to the inference process of the post-intervention
    prediction is handled through the methods implemented here.
    """
    def __init__(self, n_sims=1000, seed=None):
        self._inferences = None
        self._p_value = None
        self._simulated_y = None
        self.n_sims = n_sims
        self.rng = np.random.RandomState(seed)

    @property
    def inferences(self):
        """
        Returns pandas DataFrame of inferred inferences for post-intervention analysis.
        """
        return self._inferences

    @inferences.setter
    def inferences(self, value):
        """
        Makes attribute \`inferences\` Read-Only for the client.

        Args
        ----
          value: pandas DataFrame.
              General information of the inferences analysis performed in the
              post-intervention period.

        Raises
        ------
          AttributeError: if trying to set a new value to \`inferences\` had it already
              received the posterior analysis computation.
        """
        if self._inferences is None:
            if not isinstance(value, pd.DataFrame):
                raise ValueError('inferences must be of type pandas DataFrame')
            self._inferences = value
        else:
            raise AttributeError('inferences property is Read-Only')

    @property
    def p_value(self):
        """
        Returns the computed \`p-value\` for the inference analysis performed in the
        post-intervention period.
        """
        return self._p_value

    @p_value.setter
    def p_value(self, value):
        """
        Sets value for \`_p-value\` just once and makes sure the value is Ready-Only.

        Args
        ----
          value: float.
              Ranges between 0 and 1.

        Raises
        ------
          AttributeError: if trying to set a new value to \`p_value\` had it already
              received the posterior analysis computation.
        """
        if self._p_value is None:
            if value < 0 or value > 1:
                raise ValueError('p-value must range between 0 and 1')
            self._p_value = value
        else:
            raise AttributeError('p_value attribute is Read-Only.')

    @property
    def simulated_y(self):
        """
        In order to process lower and upper boundaries for different metrics we simulate
        several responses for \`y\` using parameters trained during the fitting phase.

        Returns
        -------
          simulations: np.array
              Array where each row is a simulation of the response variable whose shape is
              (n simulations, n points in post period).
        """
        if self._simulated_y is None:
            simulations = []
            # For more information about the \`trend\` and how it works, please refer to:
            # https://www.statsmodels.org/dev/generated/statsmodels.tsa.statespace.structural.UnobservedComponents.html
            y = np.zeros(len(self.post_data))
            exog_data = self.post_data if self.mu_sig is None else self.normed_post_data
            X = exog_data.iloc[:, 1:] if exog_data.shape[1] > 1 else None
            model = get_reference_model(self.model, y, X)
            # \`params\` is related to the parameters found when fitting the structural
            # components that best describes the observed time series.
            params = self.trained_model.params
            predicted_state = self.trained_model.predicted_state[..., -1]
            predicted_state_cov = self.trained_model.predicted_state_cov[..., -1]
            for _ in range(self.n_sims):
                initial_state = self.rng.multivariate_normal(predicted_state,
                                                             predicted_state_cov)
                sim = model.simulate(params, len(self.post_data),
                                     initial_state=initial_state,
                                     random_state=self.rng)
                if self.mu_sig:
                    sim = sim * self.mu_sig[1] + self.mu_sig[0]
                simulations.append(sim)
            self._simulated_y = np.array(simulations)
            return self._simulated_y
        else:
            return self._simulated_y

    @property
    def lower_upper_percentile(self):
        """Returns the lower and upper quantile values for the chosen \`alpha\` value.

        Returns
        -------
          lower_upper_percentile: list
            First value is the lower quantile, second value is the upper one.
        """
        # lower quantile is alpha / 2 because we want a two-tail analysis on the
        # confidence interval for our time series predictions just as upper quantile is
        # 1 - alpha / 2.
        return [self.alpha * 100. / 2., 100 - self.alpha * 100. / 2.]

    def _unstardardize(self, data):
        """
        If input data was standardized, this method is used to bring back data to its
        original form. The parameter \`self.mu_sig\` from \`main.BaseCausal\` holds the values
        used for normalization (average and std, respectively). In case \`self.mu_sig\` is
        None, it means no standardization was applied; in this case we just return data.

        Args
        ----
          self:
            mu_sig: tuple
                First value is the mean and second is the standard deviation used for
                normalization.
          data: numpy.array
              Input vector to apply unstardization.

        Returns
        -------
          numpy.array: \`data\` if \`self.mu_sig\` is None; the unstandizated data otherwise.
        """
        if self.mu_sig is None:
            return data
        return unstandardize(data, self.mu_sig)

    def _compile_posterior_inferences(self):
        """
        Runs the posterior causal impact inference computation using the already
        trained model.

        Args
        ----
          self:
            trained_model: \`UnobservedComponentsResultsWrapper\`.
            pre_data: pandas DataFrame.
            post_data: pandas DataFrame.
            alpha: float.
            mu_sig: tuple.
                First value is the mean used for standardization and second value is the
                standard deviation.
        """
        lower, upper = self.lower_upper_percentile
        exog = self.post_data if self.mu_sig is None else self.normed_post_data

        zero_series = pd.Series([0])

        # We do exactly as in statsmodels for past predictions:
        # https://github.com/statsmodels/statsmodels/blob/v0.9.0/statsmodels/tsa/statespace/structural.py
        predict = self.trained_model.filter_results.forecasts[0]
        std_errors = np.sqrt(self.trained_model.filter_results.forecasts_error_cov[0, 0])

        critical_value = get_z_score(1 - self.alpha / 2.)

        pre_preds_lower = pd.Series(
            self._unstardardize(predict - critical_value * std_errors),
            index=self.pre_data.index
        )
        pre_preds_upper = pd.Series(
            self._unstardardize(predict + critical_value * std_errors),
            index=self.pre_data.index
        )

        post_exog = exog.iloc[:, 1:] if exog.shape[1] > 1 else None
        post_predictor = self.trained_model.get_forecast(
            steps=len(self.post_data),
            exog=post_exog
        )

        pre_preds = pd.Series(
            self._unstardardize(predict),
            index=self.pre_data.index
        )
        post_preds = self._unstardardize(post_predictor.predicted_mean)

        # Sets index properly.
        post_preds.index = self.post_data.index

        # Confidence Intervals.
        post_ci = self._unstardardize(post_predictor.conf_int(alpha=self.alpha))
        post_preds_lower = post_ci.iloc[:, 0]
        post_preds_upper = post_ci.iloc[:, 1]

        # Sets index properly.
        post_preds_lower.index = self.post_data.index
        post_preds_upper.index = self.post_data.index

        # Concatenations.
        preds = pd.concat([pre_preds, post_preds])
        preds_lower = pd.concat([pre_preds_lower, post_preds_lower])
        preds_upper = pd.concat([pre_preds_upper, post_preds_upper])

        # Cumulative analysis.
        post_cum_y = np.cumsum(self.post_data.iloc[:, 0])
        post_cum_y = pd.concat([zero_series, post_cum_y], axis=0)
        post_cum_y.index = self._get_cum_index()
        post_cum_pred = np.cumsum(post_preds)
        post_cum_pred = pd.concat([zero_series, post_cum_pred])
        post_cum_pred.index = self._get_cum_index()
        post_cum_pred_lower, post_cum_pred_upper = np.percentile(
            np.cumsum(self.simulated_y, axis=1),
            [lower, upper],
            axis=0
        )

        # Sets index properly.
        post_cum_pred_lower = pd.Series(
            np.concatenate([[0], post_cum_pred_lower]),
            index=self._get_cum_index()
        )
        post_cum_pred_upper = pd.Series(
            np.concatenate([[0], post_cum_pred_upper]),
            index=self._get_cum_index()
        )

        # Using a net value of data to accomodate cases where there's gaps between
        # pre and post intervention periods.
        net_data = pd.concat([self.pre_data, self.post_data])

        # Effects analysis.
        point_effects = net_data.iloc[:, 0] - preds
        point_effects_lower = net_data.iloc[:, 0] - preds_upper
        point_effects_upper = net_data.iloc[:, 0] - preds_lower
        post_point_effects = self.post_data.iloc[:, 0] - post_preds

        # Cumulative Effects analysis.
        post_cum_effects = np.cumsum(post_point_effects)
        post_cum_effects = pd.concat([zero_series, post_cum_effects])
        post_cum_effects.index = self._get_cum_index()
        post_cum_effects_lower, post_cum_effects_upper = np.percentile(
            np.cumsum(self.post_data.iloc[:, 0].values - self.simulated_y, axis=1),
            [lower, upper],
            axis=0
        )

        # Sets index properly.
        post_cum_effects_lower = pd.Series(
            np.concatenate([[0], post_cum_effects_lower]),
            index=self._get_cum_index()
        )
        post_cum_effects_upper = pd.Series(
            np.concatenate([[0], post_cum_effects_upper]),
            index=self._get_cum_index()
        )

        self.inferences = pd.concat(
            [
                post_cum_y,
                preds,
                post_preds,
                post_preds_lower,
                post_preds_upper,
                preds_lower,
                preds_upper,
                post_cum_pred,
                post_cum_pred_lower,
                post_cum_pred_upper,
                point_effects,
                point_effects_lower,
                point_effects_upper,
                post_cum_effects,
                post_cum_effects_lower,
                post_cum_effects_upper
            ],
            axis=1,
            sort=True
        )

        self.inferences.columns = [
            'post_cum_y',
            'preds',
            'post_preds',
            'post_preds_lower',
            'post_preds_upper',
            'preds_lower',
            'preds_upper',
            'post_cum_pred',
            'post_cum_pred_lower',
            'post_cum_pred_upper',
            'point_effects',
            'point_effects_lower',
            'point_effects_upper',
            'post_cum_effects',
            'post_cum_effects_lower',
            'post_cum_effects_upper'
        ]

    def _get_cum_index(self):
        """As the cumulative data has one more data point (the first point is a zero),
        we complete to the post-intervention data the first index of the pre-data.

        Returns
        -------
          index: pandas.core.indexes
            Index that describes data points in a pandas DataFrame.
        """
        # In newer versions of Numpy/Pandas, the union operation between indices returns
        # an Index with \`dtype=object\`. We, therefore, create this variable in order to
        # restore the original value which is used later on by the plotting interface.
        index_dtype = self.post_data.index.dtype
        new_idx = self.post_data.index.union([self.pre_data.index[-1]])
        new_idx = new_idx.astype(index_dtype)
        return new_idx

    def _summarize_posterior_inferences(self):
        """
        After running the posterior inferences compilation, this method aggregates
        the results and gets the final interpretation for the causal impact results, such
        as what is the expected absolute impact of the given intervention.
        """
        lower, upper = self.lower_upper_percentile
        infers = self.inferences

        # Compute the mean of metrics.
        mean_post_y = self.post_data.iloc[:, 0].mean()
        mean_post_pred = infers['post_preds'].mean()
        mean_post_pred_lower, mean_post_pred_upper = np.percentile(
            self.simulated_y.mean(axis=1), [lower, upper])

        # Compute the sum of metrics.
        sum_post_y = self.post_data.iloc[:, 0].sum()
        sum_post_pred = infers['post_preds'].sum()
        sum_post_pred_lower, sum_post_pred_upper = np.percentile(
            self.simulated_y.sum(axis=1), [lower, upper])

        # Causal Impact analysis metrics.
        abs_effect = mean_post_y - mean_post_pred
        abs_effect_lower = mean_post_y - mean_post_pred_upper
        abs_effect_upper = mean_post_y - mean_post_pred_lower

        sum_abs_effect = sum_post_y - sum_post_pred
        sum_abs_effect_lower = sum_post_y - sum_post_pred_upper
        sum_abs_effect_upper = sum_post_y - sum_post_pred_lower

        rel_effect = abs_effect / mean_post_pred
        rel_effect_lower = abs_effect_lower / mean_post_pred
        rel_effect_upper = abs_effect_upper / mean_post_pred

        sum_rel_effect = sum_abs_effect / sum_post_pred
        sum_rel_effect_lower = sum_abs_effect_lower / sum_post_pred
        sum_rel_effect_upper = sum_abs_effect_upper / sum_post_pred

        # Prepares all this data into a DataFrame for later retrieval, such as when
        # running the \`summary\` method.
        summary_data = [
            [mean_post_y, sum_post_y],
            [mean_post_pred, sum_post_pred],
            [mean_post_pred_lower, sum_post_pred_lower],
            [mean_post_pred_upper, sum_post_pred_upper],
            [abs_effect, sum_abs_effect],
            [abs_effect_lower, sum_abs_effect_lower],
            [abs_effect_upper, sum_abs_effect_upper],
            [rel_effect, sum_rel_effect],
            [rel_effect_lower, sum_rel_effect_lower],
            [rel_effect_upper, sum_rel_effect_upper]
        ]

        self.summary_data = pd.DataFrame(
            summary_data,
            columns=['average', 'cumulative'],
            index=[
                'actual',
                'predicted',
                'predicted_lower',
                'predicted_upper',
                'abs_effect',
                'abs_effect_lower',
                'abs_effect_upper',
                'rel_effect',
                'rel_effect_lower',
                'rel_effect_upper'
            ]
        )
        # We also save the p-value which will be used in \`summary\` as well.
        self.p_value = self._compute_p_value()

    def _compute_p_value(self, n_sims=1000):
        """
        Computes the p-value for the hypothesis testing that there's signal in the
        observed data. The computation follows the same idea as the one implemented in R
        by Google which consists of simulating with the fitted parameters several time
        series for the post-intervention period and counting how many either surpass the
        total summation of \`y\` (in case there's positive relative effect) or how many
        falls under its summation (in which case there's negative relative effect).

        For a better understanding of how this solution was obtained, this discussion was
        used as the main guide:

        https://stackoverflow.com/questions/51881148/simulating-time-series-with-unobserved-components-model/

        Args
        ----
          n_sims: int.
              Representing how many simulations to run for computing the p-value.

        Returns
        -------
          p_value: float.
              Ranging between 0 and 1, represents the likelihood of obtaining the observed
              data by random chance.
        """
        y_post_sum = self.post_data.iloc[:, 0].sum()
        sim_sum = self.simulated_y.sum(axis=1)
        # The minimum value between positive and negative signals reveals how many times
        # either the summation of the simulation could surpass \`\`y_post_sum\`\` or be
        # surpassed by the same (in which case it means the sum of the simulated time
        # series is bigger than \`\`y_post_sum\`\` most of the time, meaning the signal in
        # this case reveals the impact caused the response variable to decrease from what
        # was expected had no effect taken place.
        signal = min(np.sum(sim_sum > y_post_sum), np.sum(sim_sum < y_post_sum))
        return signal / (self.n_sims + 1)
`,r=`# Copyright 2014 Google Inc. All rights reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
# http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""
Causal Impact class for running impact inferences caused in a time evolving system.
"""


from __future__ import absolute_import, division, print_function

import numpy as np
import pandas as pd
from statsmodels.tsa.statespace.structural import UnobservedComponents

from causalimpact.inferences import Inferences
from causalimpact.misc import standardize
from causalimpact.summary import Summary


class BaseCausal(Inferences, Summary):
    """
    Works as a container for attributes and methods that are used in the Causal
    Impact algorithm. Offers support for inferences, summary report and plotting
    functionality.

    Args
    ----
      data: pandas DataFrame.
          Input data processed and confirmed to be appropriate to be used in the Causal
          Impact algorithm.
      pre_period: list.
          Containing validated pre-intervention intervals.
      post_period: list.
          Containing validated post-intervention intervals.
      pre_data: pandas DataFrame.
          Sliced data regarding the pre-intervention period.
      post_data: pandas DataFrame.
          Sliced data regarding post-intervention period.
      alpha: float.
          Indicating significance level for hypothesis testing.
      mu_sig: list.
          With two values where first is the mean used to normalize \`pre_data\` and
          second value is the standard deviation also used in the normalization.
    """
    def __init__(self, data, pre_period, post_period, pre_data, post_data, alpha,
                 **kwargs):
        model_args = kwargs.get('model_args') or {}
        Inferences.__init__(self, n_sims=model_args.get('n_sims', 1000),
                            seed=model_args.get('seed'))
        Summary.__init__(self)
        self.data = data
        self.pre_period = pre_period
        self.post_period = post_period
        self.pre_data = pre_data
        self.post_data = post_data
        self.alpha = alpha
        self.normed_pre_data = None
        self.normed_post_data = None
        self.mu_sig = None


class CausalImpact(BaseCausal):
    """
    Main class used to run the Causal Impact algorithm implemented by Google as
    described in the paper:

    https://google.github.io/CausalImpact/CausalImpact.html

    The main difference between Google's R package and Python's is that in the latter the
    optimization will be performed by using Kalman Filters as implemented in \`statsmodels\`
    package, contrary to the Markov Chain Monte Carlo technique used in R.

    Despite the different techniques, results should converge to the same optimum state
    space.

    Args
    ----
      data: numpy array, pandas DataFrame.
          First column must contain the \`y\` measured value while the others contain the
          covariates \`X\` that are used in the linear regression component of the model.
          If it's a pandas DataFrame, its index can be defined either as a \`RangeIndex\`,
          an \`Index\` or \`DateTimeIndex\`.
          In case of the second, then a conversion to \`DateTime\` type is automatically
          performed; in case of failure, the original index is kept as is.
      pre_period: list.
          A list of size two containing either \`int\`, \`str\` or \`pd.Timestamp\`  values
          that references the first time point in the trained data up to the last one
          to be used in the pre-intervention period for training the model.
          For example, valid inputs are:
            - [0, 30]
            - ['20180901', '20180930']
            - [pd.to_datetime('20180901'), pd.to_datetime('20180930')]
            - [pd.Timestamp('20180901'), pd.Timestamp('20180930')]
          where \`pd\` is the pandas module.
          The latter can be used only if the input \`data\` is a pandas DataFrame whose
          index is time based.
          Ideally, it should slice the data up to when the intervention started so that
          the trained model can more precisely predict what should have happened in the
          post-intervention period had no interference taken place.
      post_period: list.
          The same as \`pre_period\` but references where the post-intervention
          data begins and ends. This is the part of \`data\` used to make inferences.
      model: \`statsmodels.tsa.statespace.structural.UnobservedComponents\`.
          If a customized model is desired than this argument can be used
          otherwise a default 'local level' model is internally built. When using a user-
          defined model, it's still required to send \`data\` as input even though the
          pre-intervention period is already present in the model \`endog\` and \`exog\`
          attributes. We do so to keep the contract of the method simpler.
      alpha: float.
          A float that ranges between 0 and 1 indicating the significance level that
          will be used when statistically testing for signal presencen in the post-
          intervention period.
      kwargs:
        standardize: bool.
            If \`True\`, applies standardizes data to have zero mean and unitary standard
            deviation.
        disp: bool.
            Whether to print log associated to the \`fit\` method or not. \`False\` means no
            printing.
        prior_level_sd: float.
            Prior value for the local level standard deviation. If the explicit value of
            \`None\` is sent then an automatic optimization of the local level will take
            place. This is recommended when there's uncertainty about what prior value is
            appropriate for the data. In general, if the exogenous values are good
            descriptors of the observed response then this value can be low
            (such as the default of 0.01). In cases where there's not a complete
            correlation between exogenous and endogenous variables, the value 0.1 can be
            used, as suggested by Google. If no value is chosen at all, the value of
            \`0.01\` will be used as default value.
        nseasons: list of dicts.
            Models for \`n\` seasonal components in input response data. A seasonal
            component can be described as a pattern that repeats itself with peridiocity
            \`s\`. In \`statsmodels\` library, we have the option of doing so by using either
            the parameter \`seasonal\`, which uses \`(s-1)\` variables for each point of the
            series, or \`freq_seasonal\`, which is the one used in this package.
            The difference is that in the latter the equations are expressed in the
            frequency domain and accepts more than one seasonal component, such as a
            weekly and another monthly ones. If, for instance, in the input daily data has
            a known weekly and a montly seasonal components, then this paramter can be
            used like:
            \`nseasons=[{'period': 7}, {'period': 30}]\`. You can also specify how many
            harmonics should be used to express the final value, such as:
            \`nseasons=[{'period': 7, 'harmonics': 3}, {'period': 30, 'harmonics': 5}]\`.
            If no value is used for \`harmonics\`, its total amount \`h\` will be considered
            to be :math:\`floor(s/2)\`. Default value is [] meaning no seasonal component
            should be modeled in the fitting process. For more information, please refer
            to statsmodels docs:

            https://www.statsmodels.org/dev/generated/statsmodels.tsa.statespace.structural.UnobservedComponents.html
            If a custom model is used then it should already contain the definition of
            the seasonal components.

    Returns
    -------
      CausalImpact object with infereces already processed.

    Examples:
    ---------
      >>> import numpy as np
      >>> from statsmodels.tsa.statespace.structural import UnobservedComponents
      >>> from statsmodels.tsa.arima_process import ArmaProcess

      >>> np.random.seed(12345)
      >>> ar = np.r_[1, 0.9]
      >>> ma = np.array([1])
      >>> arma_process = ArmaProcess(ar, ma)
      >>> X = 100 + arma_process.generate_sample(nsample=100)
      >>> y = 1.2 * X + np.random.normal(size=100)
      >>> data = pd.DataFrame({'y': y, 'X': X}, columns=['y', 'X'])
      >>> pre_period = [0, 69]
      >>> post_period = [70, 99]

      >>> ci = CausalImpact(data, pre_period, post_period)
      >>> ci.summary()
      >>> ci.summary('report')
      >>> ci.plot()

      Using pandas DataFrames:

      >>> df = pd.DataFrame(data)
      >>> df = df.set_index(pd.date_range(start='20180101', periods=len(data)))
      >>> pre_period = ['20180101', '20180311']
      >>> post_period = ['20180312', '20180410']
      >>> ci = CausalImpact(df, pre_period, post_period)

      Using pandas DataFrames with pandas timestamps:

      >>> df = pd.DataFrame(data)
      >>> df = df.set_index(pd.date_range(start='20180101', periods=len(data)))
      >>> pre_period = [pd.to_datetime('20180101'), pd.to_datetime('20180311')]
      >>> post_period = [pd.to_datetime('20180312'), pd.to_datetime('20180410')]
      >>> ci = CausalImpact(df, pre_period, post_period)

      Using automatic local level optimization:

      >>> df = pd.DataFrame(data)
      >>> df = df.set_index(pd.date_range(start='20180101', periods=len(data)))
      >>> pre_period = ['20180101', '20180311']
      >>> post_period = ['20180312', '20180410']
      >>> ci = CausalImpact(df, pre_period, post_period, prior_level_sd=None)

      Using seasonal components:

      >>> df = pd.DataFrame(data)
      >>> df = df.set_index(pd.date_range(start='20180101', periods=len(data)))
      >>> pre_period = ['20180101', '20180311']
      >>> post_period = ['20180312', '20180410']
      >>> ci = CausalImpact(df, pre_period, post_period, nseasons=[{'period': 7}])

      Using a customized model:

      >>> pre_y = data[:70, 0]
      >>> pre_X = data[:70, 1:]
      >>> ucm = UnobservedComponents(endog=pre_y, level='llevel', exog=pre_X)
      >>> ci = CausalImpact(data, pre_period, post_period, model=ucm)
    """
    def __init__(self, data, pre_period, post_period, model=None, alpha=0.05, **kwargs):
        checked_input = self._process_input_data(
            data, pre_period, post_period, model, alpha, **kwargs
        )
        super(CausalImpact, self).__init__(**checked_input)
        self.model_args = checked_input['model_args']
        self.model = checked_input['model']
        self._fit_model()
        self._process_posterior_inferences()

    @property
    def model_args(self):
        """
        Gets the general settings used to guide the creation of the Causal model.

        Returns
        -------
          dict:
            standardize: bool.
        """
        return self._model_args

    @model_args.setter
    def model_args(self, value):
        """
        Sets general settings for how to build the Causal model.

        Args
        ----
          value: dict
              standardize: bool.
              nseasons: list of dicts.
        """
        if value.get('standardize'):
            self._standardize_pre_post_data()
        self._model_args = value

    @property
    def model(self):
        """
        Gets UnobservedComponents model that will be used for computing the Causal
        Impact algorithm.
        """
        return self._model

    @model.setter
    def model(self, value):
        """
        Sets model object.

        Args
        ----
          value: \`UnobservedComponents\`.
        """
        if value is None:
            self._model = self._get_default_model()
        else:
            self._model = value

    def _fit_model(self):
        """
        Uses the built model, prepares the arguments and fits the kalman filter for the
        inferences phase.
        """
        fit_args = self._process_fit_args()
        self.trained_model = self.model.fit(**fit_args)

    def _standardize_pre_post_data(self):
        """
        Applies normal standardization in pre and post data, based on mean and std of
        pre-data (as it's used for training our model). Sets new values for
        \`self.pre_data\`, \`self.post_data\`, \`self.mu_sig\`.
        """
        self.normed_pre_data, (mu, sig) = standardize(self.pre_data)
        self.normed_post_data = (self.post_data - mu) / sig
        self.mu_sig = (mu.iloc[0], sig.iloc[0])

    def _process_posterior_inferences(self):
        """
        Uses the trained model to make predictions for the post-intervention (or test
        data) period by invoking the class \`Inferences\` to process the forecasts. All
        data related to predictions, point effects and cumulative responses will be
        processed here.
        """
        self._compile_posterior_inferences()
        self._summarize_posterior_inferences()

    def _get_default_model(self):
        """Constructs default local level unobserved states model using input data and
        \`self.model_args\`.

        Returns
        -------
          model: \`UnobservedComponents\` built using pre-intervention data as training
              data.
        """
        data = self.pre_data if self.normed_pre_data is None else self.normed_pre_data
        y = data.iloc[:, 0]
        X = data.iloc[:, 1:] if data.shape[1] > 1 else None
        freq_seasonal = self.model_args.get('nseasons')
        model = UnobservedComponents(endog=y, level='llevel', exog=X,
                                     freq_seasonal=freq_seasonal)
        return model

    def _process_input_data(self, data, pre_period, post_period, model, alpha, **kwargs):
        """
        Checks and formats when appropriate the input data for running the Causal
        Impact algorithm. Performs assertions such as missing or invalid arguments.

        Args
        ----
          data: numpy.array, pandas.DataFrame.
              First column is the response variable \`y\` and other columns correspond to
              the covariates \`X\`.
          pre_data: numpy.array, pandas.DataFrame.
              Pre-intervention data sliced from input data.
          post_data: numpy.array, pandas.DataFrame.
              Post_intervention data sliced from input data.
          model: None, UnobservedComponents.
          alpha: float.
          kwargs:
            standardize: bool.
            disp: bool.
            prior_level_sd: float.
            nseasons: list of dicts.

        Returns
        -------
          dict of:
            data: pandas DataFrame.
                Validated data, first column is \`y\` and the others is the \`X\` covariates.
            pre_data: pandas DataFrame.
                Data sliced using \`pre_period\` values.
            post_data: pandas DataFrame.
            model: Either \`None\` or \`UnobservedComponents\` validated to be correct.
            alpha: float ranging from 0 to 1.
            model_args: dict containing general information related to how to process
                the causal impact algorithm.

        Raises
        ------
          ValueError: if input arguments is \`None\`.
        """
        input_args = locals().copy()
        model = input_args.pop('model')
        none_args = [arg for arg, value in input_args.items() if value is None]
        if none_args:
            raise ValueError('{args} input cannot be empty'.format(
                             args=', '.join(none_args)))
        processed_data = self._format_input_data(data)
        pre_data, post_data = self._process_pre_post_data(processed_data, pre_period,
                                                          post_period)
        alpha = self._process_alpha(alpha)
        model_args = self._process_model_args(**kwargs)
        if model:
            model = self._process_input_model(model)
        return {
            'data': processed_data,
            'pre_period': pre_period,
            'post_period': post_period,
            'pre_data': pre_data,
            'post_data': post_data,
            'model': model,
            'alpha': alpha,
            'model_args':  model_args
        }

    def _process_fit_args(self):
        """
        Process the input that will be used in the fitting process for the model.

        Args
        ----
          self:
            model: \`UnobservedComponents\` from statsmodels.
                If \`None\` them it means the fitting process will work with default model.
                Process level information of customized model otherwise.
            model_args: dict.
                Input args for general options of the model. All keywords defined
                in \`scipy.optimize.minimize\` can be used here. For more details,
                please refer to:
                https://docs.scipy.org/doc/scipy/reference/generated/scipy.optimize.minimize.html

              disp: bool.
                  Whether to display the logging of the \`statsmodels\` fitting process or
                  not. Defaults to \`False\` which means not display any logging.

              prior_level_sd: float.
                  Prior value to be used as reference for the fitting process.

        Returns
        -------
          model_args: dict
              The arguments that will be used in the \`fit\` method.
        """
        fit_args = self.model_args.copy()
        # These keys configure model construction, not the optimizer; statsmodels
        # raises on unknown fit kwargs after 0.14.
        for key in ('standardize', 'nseasons', 'prior_level_sd', 'n_sims', 'seed'):
            fit_args.pop(key, None)
        fit_args.setdefault('disp', False)
        level_sd = self.model_args.get('prior_level_sd', 0.01)
        n_params = len(self.model.param_names)
        level_idx = [idx for (idx, name) in enumerate(self.model.param_names) if
                     name == 'sigma2.level']
        bounds = [(None, None)] * n_params
        if level_idx:  # If chosen model do not have level defined then this is None.
            level_idx = level_idx[0]
            # We make the maximum relative variation be up to 20% in order to simulate
            # an approximate behavior of the respective algorithm implemented in R.
            bounds[level_idx] = (
                level_sd / 1.2 if level_sd is not None else None,
                level_sd * 1.2 if level_sd is not None else None
            )
        fit_args.setdefault('bounds', bounds)
        return fit_args

    def _validate_y(self, y):
        """
        Validates if input response variable is correct and doesn't have invalid input.

        Args
        ----
          y: pandas Series.
             Response variable sent in input data in first column.

        Raises
        ------
          ValueError: if values in \`y\` are Null.
                      if less than 3 (three) non-null values in \`y\` (as in this case
                          we can't even train a model).
                      if \`y\` is constant (in this case it doesn't make much sense to
                        make predictions as the time series doesn't change in the training
                        phase.
        """
        if np.all(y.isna()):
            raise ValueError('Input response cannot have just Null values.')
        if y.notna().values.sum() < 3:
            raise ValueError('Input response must have more than 3 non-null '
                             'points at least.')
        if y.std(skipna=True, ddof=0) == 0:
            raise ValueError('Input response cannot be constant.')

    def _process_alpha(self, alpha):
        """
        Asserts input \`alpha\` is appropriate to be used in the model.

        Args
        ----
          alpha: float.
              Ranges from 0 up to 1 indicating level of significance to assert when
              testing for presence of signal in post-intervention data.

        Returns
        -------
          alpha: float.
              Validated \`alpha\` value.

        Raises
        ------
          ValueError: if alpha is not float.
                      if alpha is not between 0. and 1.
        """
        if not isinstance(alpha, float):
            raise ValueError('alpha must be of type float.')
        if alpha < 0 or alpha > 1:
            raise ValueError(
                'alpha must range between 0 (zero) and 1 (one) inclusive.'
            )
        return alpha

    def _process_input_model(self, model):
        """
        Checkes whether input model was properly built and is ready to be run.

        Args
        ----
          model: \`UnobservedComponents\`.

        Returns
        -------
          model: \`UnobservedComponents\`.
              Validated model.

        Raises
        ------
          ValueError: if model is not of appropriate type.
                      if model doesn't have attribute level or it's not set.
                      if model doesn't have attribute exog or it's not set.
                      if model doesn't have attribute data or it's not set.
        """
        if not isinstance(model, UnobservedComponents):
            raise ValueError('Input model must be of type UnobservedComponents.')
        if not model.level:
            raise ValueError('Model must have level attribute set.')
        if model.exog is None:
            raise ValueError('Model must have exog attribute set.')
        if model.data is None:
            raise ValueError('Model must have data attribute set.')
        return model

    def _process_model_args(self, **kwargs):
        """
        Process general parameters related to how Causal Impact will be implemented, such
        as standardization procedure or the addition of seasonal components to the model.

        Args
        ----
          kwargs:
            standardize: bool.
            nseasons: list of dicts.
            other keys used in fitting process.

        Returns
        -------
          dict of:
            standardize: bool.
            nseasons: list of dicts.
            other keys used in fitting process.

        Raises
        ------
          ValueError: if standardize is not of type \`bool\`.
                      if nseasons doesn't follow the pattern [{str key: number}].
        """
        standardize = kwargs.get('standardize')
        if standardize is None:
            standardize = True  # Default behaviour is to set standardization to True.
        if not isinstance(standardize, bool):
            raise ValueError('Standardize argument must be of type bool.')
        kwargs['standardize'] = standardize
        nseasons = kwargs.get('nseasons')
        if nseasons is None:
            nseasons = []
        for season in nseasons:
            if not isinstance(season, dict):
                raise ValueError(
                    'nseasons must be a list of dicts with the required key "period" '
                    'and the optional key "harmonics".'
                )
            if 'period' not in season:
                raise ValueError('nseasons dicts must contain the key "period" defined.')
            if 'harmonics' in season:
                if season.get('harmonics') > season['period'] / 2:
                    raise ValueError(
                        'Total harmonics must be less or equal than periods '
                        'divided by 2.'
                    )
        kwargs['nseasons'] = nseasons
        return kwargs

    def _format_input_data(self, data):
        """
        Validates and formats input data.

        Args
        ----
          data: \`numpy.array\` or \`pandas.DataFrame\`.

        Returns
        -------
          data: pandas DataFrame.
              Validated data to be used in Causal Impact algorithm.

        Raises
        ------
          ValueError: if input \`data\` is non-convertible to pandas DataFrame.
                      if input \`data\` has non-numeric values.
                      if input \`data\` has less than 3 points.
                      if input covariates have NAN values.
        """
        if not isinstance(data, pd.DataFrame):
            try:
                data = pd.DataFrame(data)
            except ValueError:
                raise ValueError(
                    'Could not transform input data to pandas DataFrame.'
                )
        self._validate_y(data.iloc[:, 0])
        # Must contain only numeric values
        if not data.map(np.isreal).values.all():
            raise ValueError('Input data must contain only numeric values.')
        # Covariates cannot have NAN values
        if data.shape[1] > 1:
            if data.iloc[:, 1:].isna().values.any():
                raise ValueError('Input data cannot have NAN values.')
        # If index is a string of dates, try to convert it to datetimes which helps
        # in plotting.
        data = self._convert_index_to_datetime(data)
        return data

    def _convert_index_to_datetime(self, data):
        """
        If input data has index of string dates, i.e, '20180101', '20180102'..., try
        to convert it to datetime specifically, which results in
        Timestamp('2018-01-01 00:00:00'), Timestamp('2018-01-02 00:00:00')

        Args
        ----
          data: pandas DataFrame
              Input data used in causal impact analysis.

        Returns
        -------
          data: pandas DataFrame
              Same input data with potentially new index of type DateTime.
        """
        if isinstance(data.index.values[0], str):
            try:
                data.set_index(pd.to_datetime(data.index), inplace=True)
            except ValueError:
                pass
        return data

    def _process_pre_post_data(self, data, pre_period, post_period):
        """
        Checks \`pre_period\`, \`post_period\` and returns data sliced accordingly to  each
        period.

        Args
        ----
          data: pandas DataFrame.
          pre_period: list.
              Contains either \`int\` or \`str\` values.
          post_period: same as \`pre_period\`.

        Returns
        -------
          result: list.
              First value is pre-intervention data and second value is post-intervention.

        Raises
        ------
          ValueError: if pre_period last value is bigger than post intervention period.
        """
        checked_pre_period = self._process_period(pre_period, data)
        checked_post_period = self._process_period(post_period, data)

        if checked_pre_period[1] > checked_post_period[0]:
            raise ValueError(
                'Values in training data cannot be present in the post-intervention '
                'data. Please fix your pre_period value to cover at most one point less '
                'from when the intervention happened.'
            )
        if checked_pre_period[1] < checked_pre_period[0]:
            raise ValueError('pre_period last number must be bigger than its first.')
        if checked_pre_period[1] - checked_pre_period[0] < 3:
            raise ValueError('pre_period must span at least 3 time points.')
        if checked_post_period[1] < checked_post_period[0]:
            raise ValueError('post_period last number must be bigger than its first.')
        if checked_post_period[0] <= checked_pre_period[1]:
            raise ValueError(f'post_period first value ({post_period[0]}) must '
                             'be bigger than the second value of pre_period '
                             f'({pre_period[1]}).')

        result = [
            data.loc[pre_period[0]: pre_period[1], :],
            data.loc[post_period[0]: post_period[1], :]
        ]
        return result

    def _process_period(self, period, data):
        """
        Validates period inputs.

        Args
        ----
          period: list.
              Containing two values that can be either \`int\`, \`str\` or \`pd.Timestamp\`
          data: pandas DataFrame.
              Input Causal Impact data.

        Returns
        -------
          period: list.
              Validated period list.

        Raises
        ------
          ValueError: if input \`period\` is not of type list.
                      if input doesn't have two elements.
                      if period date values are not present in data.
        """
        if not isinstance(period, list):
            raise ValueError('Input period must be of type list.')
        if len(period) != 2:
            raise ValueError(
                'Period must have two values regarding the beginning and end of '
                'the pre and post intervention data.'
            )
        none_args = [d for d in period if d is None]
        if none_args:
            raise ValueError('Input period cannot have \`None\` values.')
        if not (
            (isinstance(period[0], int) and isinstance(period[1], int)) or
            (isinstance(period[1], str) and isinstance(period[1], str)) or
            (isinstance(period[1], pd.Timestamp) and isinstance(period[1], pd.Timestamp))
        ):
            raise ValueError('Input must contain either int, str or pandas Timestamp')
        # Tests whether the input period is indeed present in the input data index.
        for point in period:
            if point not in data.index:
                if isinstance(point, pd.Timestamp):
                    point = point.strftime('%Y%m%d')
                raise ValueError("{point} not present in input data index.".format(
                    point=str(point)
                    )
                )
        if isinstance(period[0], str) or isinstance(period[0], pd.Timestamp):
            period = self._convert_str_period_to_int(period, data)
        return period

    def _convert_str_period_to_int(self, period, data):
        """
        Converts string values from \`period\` to integer offsets from \`data\`.

        Args
        ----
          period: list of str or pandas timestamps
          data: pandas DataFrame.

        Returns
        -------
          period: list of int.
              Where each value is the correspondent integer based value in \`data\` index.
        """
        result = []
        for date in period:
            offset = data.index.get_loc(date)
            result.append(offset)
        return result
`,i=`# Copyright 2014 Google Inc. All rights reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
# http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""Miscellaneous functions to help in the implementation of Causal Impact."""


from __future__ import absolute_import, division, print_function

import scipy.stats as stats
from statsmodels.tsa.statespace.structural import UnobservedComponents


def standardize(data):
    """
    Applies standardization to input data. Result should have mean zero and standard
    deviation of one.

    Args
    ----
      data: pandas DataFrame.

    Returns
    -------
      list:
        data: standardized data with zero mean and std of one.
        tuple:
          mean and standard deviation used on each column of input data to make
          standardization. These values should be used to obtain the original dataframe.

    Raises
    ------
      ValueError: if data has only one value.
    """
    if data.shape[0] == 1:
        raise ValueError('Input data must have more than one value')
    mu = data.mean(skipna=True)
    std = data.std(skipna=True, ddof=0)
    data = (data - mu) / std.fillna(1)
    return [data, (mu, std)]


def unstandardize(data, mus_sigs):
    """
    Applies the inverse transformation to return to original data.

    Args
    ----
      data: pandas DataFrame with zero mean and std of one.
      mus_sigs: tuple where first value is the mean used for the standardization and
                second value is the respective standard deviaion.

    Returns
    -------
      data: pandas DataFrame with mean and std given by input \`\`mus_sigs\`\`
    """
    mu, sig = mus_sigs
    data = (data * sig) + mu
    return data


def get_z_score(p):
    """
    Returns the correspondent z-score with probability area p.

    Args
    ----
      p: float ranging between 0 and 1 representing the probability area to convert.

    Returns
    -------
      The z-score correspondent of p.
    """
    return stats.norm.ppf(p)


def get_reference_model(model, endog, exog):
    """
    Build an \`UnobservedComponents\` model using as reference the input \`model\`. We need
    an exactly similar object as \`model\` but instantiated with different \`endog\` and
    \`exog\`.

    Args
    ----
      model: \`UnobservedComponents\`.
          Template model that is used as reference to build a new one with new \`endog\`
          and \`exog\` variables.
      endog: pandas.Series.
          New endog value to be used in model.
      exog: pandas.Series.
          New exog value to be used in model. If original model does not contain
          exogenous variables then it's not set in \`ref_model\`.

    Returns
    -------
      ref_model: \`UnobservedComponents\`.
          New model built from input \`model\` setup.
    """
    model_args = model._get_init_kwds()
    model_args['endog'] = endog
    if model.exog is not None:
        model_args['exog'] = exog
    ref_model = UnobservedComponents(**model_args)
    return ref_model
`,a=`# Copyright 2014 Google Inc. All rights reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
# http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""
Summarizes performance information inferred in post-inferences compilation process.
"""


from __future__ import absolute_import, division, print_function

import os

from jinja2 import Template

from causalimpact.misc import get_z_score

_here = os.path.dirname(os.path.abspath(__file__))
summary_tmpl_path = os.path.join(_here, 'templates', 'summary')
report_tmpl_path = os.path.join(_here, 'templates', 'report')

SUMMARY_TMPL = Template(open(summary_tmpl_path).read())
REPORT_TMPL = Template(open(report_tmpl_path).read())


class Summary(object):
    """
    Prepares final summary with causal impact results telling whether an effect has been
    identified in data or not.
    """
    def __init__(self):
        self.summary_data = None

    def summary(self, output='summary', digits=2):
        """
        Returns final results from causal impact analysis, such as absolute observed
        effect, the relative effect between prediction and observed variable, cumulative
        performances in post-intervention period among other metrics.

        Args
        ----
          output: str.
              Can be either "summary" or "report". The first is a simpler output just
              informing general metrics such as expected absolute or relative effect.

          digits: int.
              Defines the number of digits after the decimal point to round. For
              digits=2, value 1.566 becomes 1.57.

        Returns
        -------
          summary: str.
              Contains results of the causal impact analysis.

        Raises
        ------
          RuntimeError: if \`self.summary_data\` is None meaning the post inference
              compilation was not performed yet.
        """
        if self.summary_data is None:
            raise RuntimeError('Posterior inferences must be first computed before '
                               'running summary.')
        if output not in {'summary', 'report'}:
            raise ValueError('Please choose either summary or report for output.')
        if output == 'summary':
            summary = SUMMARY_TMPL.render(
                summary=self.summary_data.to_dict(),
                alpha=self.alpha,
                z_score=get_z_score(1 - self.alpha / 2.),
                p_value=self.p_value,
                digits=digits
            )
        else:
            summary = REPORT_TMPL.render(
                summary=self.summary_data.to_dict(),
                alpha=self.alpha,
                p_value=self.p_value,
                digits=digits
            )
        return summary
`,o=`{% set detected_sig = not (summary.average.rel_effect_lower < 0 and summary.average.rel_effect_upper > 0) -%}
{% set positive_sig = summary.average.rel_effect > 0 -%}
{% macro CI(alpha) %}{{(((1 - alpha) * 100) | string).rstrip('0').rstrip('.')}}%{% endmacro -%}
Analysis report {CausalImpact}


During the post-intervention period, the response variable had
an average value of approx. {{summary.average.actual | round(digits)}}. {% if detected_sig -%}By contrast, in{% else %}In{% endif %} the absence of an
intervention, we would have expected an average response of {{summary.average.predicted | round(digits)}}.
The {{CI(alpha)}} interval of this counterfactual prediction is [{{summary.average.predicted_lower | round(digits)}}, {{summary.average.predicted_upper | round(digits)}}].
Subtracting this prediction from the observed response yields
an estimate of the causal effect the intervention had on the
response variable. This effect is {{summary.average.abs_effect | round(digits)}} with a {{CI(alpha)}} interval of
{{[summary.average.abs_effect_lower | round(digits), summary.average.abs_effect_upper | round(digits)] | sort}}. For a discussion of the significance of this effect,
see below.


Summing up the individual data points during the post-intervention
period (which can only sometimes be meaningfully interpreted), the
response variable had an overall value of {{summary.cumulative.actual | round(digits)}}.
{% if detected_sig %}By contrast, had{% else %}Had{% endif %} the intervention not taken place, we would have expected
a sum of {{summary.cumulative.predicted| round(digits)}}. The {{CI(alpha)}} interval of this prediction is {{[summary.cumulative.predicted_lower | round(digits), summary.cumulative.predicted_upper | round(digits)]|sort}}.


The above results are given in terms of absolute numbers. In relative
terms, the response variable showed {% if positive_sig %}an increase of +{% else %}a decrease of {% endif %}{{(100 * summary.average.rel_effect) | round(digits)}}%. The {{CI(alpha)}}
interval of this percentage is [{{([(100 * summary.average.rel_effect_lower) | round(digits), (100 * summary.average.rel_effect_upper) | round(digits)] | min)}}%, {{([(100 * summary.average.rel_effect_upper) | round(digits), (100 * summary.average.rel_effect_lower) | round(digits)] | max)}}%].
{% if detected_sig and positive_sig %}

This means that the positive effect observed during the intervention
period is statistically significant and unlikely to be due to random
fluctuations. It should be noted, however, that the question of whether
this increase also bears substantive significance can only be answered
by comparing the absolute effect ({{summary.average.abs_effect | round(digits)}}) to the original goal
of the underlying intervention.
{% elif detected_sig and not positive_sig %}

This means that the negative effect observed during the intervention
period is statistically significant.
If the experimenter had expected a positive effect, it is recommended
to double-check whether anomalies in the control variables may have
caused an overly optimistic expectation of what should have happened
in the response variable in the absence of the intervention.
{% elif not detected_sig and positive_sig %}

This means that, although the intervention appears to have caused a
positive effect, this effect is not statistically significant when
considering the entire post-intervention period as a whole. Individual
days or shorter stretches within the intervention period may of course
still have had a significant effect, as indicated whenever the lower
limit of the impact time series (lower plot) was above zero.
{% elif not detected_sig and not positive_sig -%}

This means that, although it may look as though the intervention has
exerted a negative effect on the response variable when considering
the intervention period as a whole, this effect is not statistically
significant and so cannot be meaningfully interpreted.
{% endif %}
{%- if not detected_sig %}

The apparent effect could be the result of random fluctuations that
are unrelated to the intervention. This is often the case when the
intervention period is very long and includes much of the time when
the effect has already worn off. It can also be the case when the
intervention period is too short to distinguish the signal from the
noise. Finally, failing to find a significant effect can happen when
there are not enough control variables or when these variables do not
correlate well with the response variable during the learning period.
{% endif %}
{%- if p_value < alpha %}

The probability of obtaining this effect by chance is very small
(Bayesian one-sided tail-area probability p = {{p_value | round(digits)}}).
This means the causal effect can be considered statistically
significant.
{%- else %}

The probability of obtaining this effect by chance is p = {{(p_value * 100) | round(digits)}}%.
This means the effect may be spurious and would generally not be
considered statistically significant.
{%- endif -%}
`,s=`{% macro CI(alpha) %}{{(((1 - alpha) * 100) | string).rstrip('0').rstrip('.')}}% CI{% endmacro -%}
{% macro SD(lower, upper, z_score, digits=2) %}{{((([upper, lower]|max) - ([upper, lower]|min)) / (2 * z_score)) | round(digits)}}{% endmacro -%}
{% macro add_remaining_spaces(n) %}{{' ' * (19 -n)}}{% endmacro -%}
Posterior Inference {Causal Impact}
                          Average            Cumulative
Actual                    {{summary.average.actual | round(digits)}}{{add_remaining_spaces(summary.average.actual | round(digits) | string | length)}}{{summary.cumulative.actual | round(digits)}}
Prediction (s.d.)         {{summary.average.predicted | round(digits)}} ({{SD(summary.average.predicted_lower, summary.average.predicted_upper, z_score, digits)}}){{add_remaining_spaces(summary.average.predicted | round(digits) | string | length + 3 + SD(summary.average.predicted_lower, summary.average.predicted_upper, z_score, digits) | string | length)}}{{summary.cumulative.predicted | round(digits)}} ({{SD(summary.cumulative.predicted_lower, summary.cumulative.predicted_upper, z_score, digits)}})
{{CI(alpha)}}                    [{{summary.average.predicted_lower | round(digits)}}, {{summary.average.predicted_upper | round(digits)}}]{{add_remaining_spaces(4 + summary.average.predicted_lower | round(digits) | string | length + summary.average.predicted_upper | round(digits) | string | length)}}[{{summary.cumulative.predicted_lower | round(digits)}}, {{summary.cumulative.predicted_upper | round(digits)}}]

Absolute effect (s.d.)    {{summary.average.abs_effect | round(digits)}} ({{SD(summary.average.abs_effect_lower, summary.average.abs_effect_upper, z_score, digits)}}){{add_remaining_spaces(3 + summary.average.abs_effect | round(digits) | string | length + SD(summary.average.abs_effect_lower, summary.average.abs_effect_upper, z_score, digits) | string | length)}}{{summary.cumulative.abs_effect | round(digits)}} ({{SD(summary.cumulative.abs_effect_lower, summary.cumulative.abs_effect_upper, z_score, digits)}})
{{CI(alpha)}}                    {{[summary.average.abs_effect_lower | round(digits), summary.average.abs_effect_upper | round(digits)] | sort}}{{add_remaining_spaces(4 + summary.average.abs_effect_lower | round(digits) | string | length + summary.average.abs_effect_upper | round(digits) | string | length)}}{{[summary.cumulative.abs_effect_lower | round(digits), summary.cumulative.abs_effect_upper | round(digits)] | sort}}

Relative effect (s.d.)    {{(summary.average.rel_effect * 100) | round(digits)}}% ({{(100 * SD(summary.average.rel_effect_lower, summary.average.rel_effect_upper, z_score, 4) | float) | round(digits)}}%){{add_remaining_spaces(5 + (summary.average.rel_effect * 100) | round(digits) | string | length + (100 * SD(summary.average.rel_effect_lower, summary.average.rel_effect_upper, z_score, 4) | float) | round(digits) | string | length)}}{{(100 * summary.cumulative.rel_effect) | round(digits)}}% ({{(100 * SD(summary.cumulative.rel_effect_lower, summary.cumulative.rel_effect_upper, z_score, 4)|float) | round(digits)}}%)
{{CI(alpha)}}                    [{{([(summary.average.rel_effect_lower * 100) | round(digits), (summary.average.rel_effect_upper * 100) | round(digits)] | min)}}%, {{([(100 * summary.average.rel_effect_upper) | round(digits), (100 * summary.average.rel_effect_lower) | round(digits)] | max)}}%]{{add_remaining_spaces(6 + ([(summary.average.rel_effect_lower * 100) | round(digits), (summary.average.rel_effect_upper * 100) | round(digits)] | min) | string | length +  ([(100 * summary.average.rel_effect_upper) | round(digits), (100 * summary.average.rel_effect_lower) | round(digits)] | max) | string | length)}}[{{([(100 * summary.cumulative.rel_effect_lower) | round(digits), (100 * summary.cumulative.rel_effect_upper) | round(digits)] | min)}}%, {{([(100 * summary.cumulative.rel_effect_upper) | round(digits), (100 * summary.cumulative.rel_effect_lower) | round(digits)] | max)}}%]

Posterior tail-area probability p: {{p_value|round(digits)}}
Posterior prob. of a causal effect: {{((1 - p_value) * 100) | round(digits)}}%

For more details run the command: print(impact.summary('report'))
`,c=`"""Bayesian structural time-series engine: local level + spike-and-slab regression.

A pure-numpy Gibbs sampler in the spirit of bsts as used by R's CausalImpact:
  y_t = mu_t + x_t' beta + eps_t,   eps_t ~ N(0, sigma_obs^2)
  mu_{t+1} = mu_t + eta_t,          eta_t ~ N(0, sigma_level^2)

Sampling steps per iteration:
  1. FFBS (Carter-Kohn) for the level states given betas and variances.
  2. SSVS for inclusion indicators gamma with beta and sigma_obs^2 integrated
     out (normal-inverse-gamma conjugacy, Zellner-style information prior with
     diagonal shrinkage), then draw sigma_obs^2 and beta_gamma.
  3. Conjugate inverse-gamma draw for sigma_level^2, truncated above.

Data is standardized internally by pre-period mean/sd, so prior_level_sd is a
fraction of sd(y) — the same convention as R's CausalImpact.
"""

import numpy as np

# Prior weights (data is standardized, so these are on the sd(y)=1 scale).
LEVEL_PRIOR_DF = 32.0          # CausalImpact's SdPrior sample.size for the level
LEVEL_SD_UPPER = 1.0           # truncate sigma_level at sd(y)
OBS_PRIOR_DF = 0.01            # near-uninformative prior on observation noise
OBS_PRIOR_GUESS = 0.5
PRIOR_INFO_WEIGHT = 1.0        # Zellner prior worth ~1 observation
DIAGONAL_SHRINKAGE = 0.5
PRIOR_INCLUSION_PROB = 0.5
INIT_STATE_VAR = 100.0


def _ffbs(z, sigma_obs2, sigma_level2, rng):
    """Forward-filter backward-sample the local level for series z."""
    n = len(z)
    m = np.empty(n)
    p = np.empty(n)
    m_prev, p_prev = 0.0, INIT_STATE_VAR
    for t in range(n):
        p_pred = p_prev + sigma_level2
        gain = p_pred / (p_pred + sigma_obs2)
        m_prev = m_prev + gain * (z[t] - m_prev)
        p_prev = (1.0 - gain) * p_pred
        m[t], p[t] = m_prev, p_prev
    mu = np.empty(n)
    mu[-1] = rng.normal(m[-1], np.sqrt(p[-1]))
    for t in range(n - 2, -1, -1):
        h = p[t] / (p[t] + sigma_level2)
        mean = m[t] + h * (mu[t + 1] - m[t])
        var = p[t] * (1.0 - h)
        mu[t] = rng.normal(mean, np.sqrt(max(var, 0.0)))
    return mu


def _log_marginal(e, X, gamma, prior_prec):
    """Log marginal of the regression target e under inclusion set gamma,
    with beta and sigma_obs^2 integrated out (up to gamma-independent terms)."""
    n = len(e)
    sse_prior = OBS_PRIOR_DF * OBS_PRIOR_GUESS ** 2 + e @ e
    k = int(gamma.sum())
    log_prior = k * np.log(PRIOR_INCLUSION_PROB) + \\
        (len(gamma) - k) * np.log1p(-PRIOR_INCLUSION_PROB)
    if k == 0:
        return log_prior - 0.5 * (OBS_PRIOR_DF + n) * np.log(sse_prior)
    Xg = X[:, gamma]
    omega = prior_prec[np.ix_(gamma, gamma)]
    vn_inv = omega + Xg.T @ Xg
    xte = Xg.T @ e
    ln = np.linalg.cholesky(vn_inv)
    lo = np.linalg.cholesky(omega)
    u = np.linalg.solve(ln, xte)
    quad = u @ u
    logdet_vn_inv = 2.0 * np.log(np.diag(ln)).sum()
    logdet_omega = 2.0 * np.log(np.diag(lo)).sum()
    return (
        log_prior
        + 0.5 * (logdet_omega - logdet_vn_inv)
        - 0.5 * (OBS_PRIOR_DF + n) * np.log(sse_prior - quad)
    )


def _sample_regression(e, X, gamma, prior_prec, rng):
    """Draw sigma_obs^2 and beta given inclusion set gamma."""
    n = len(e)
    k = int(gamma.sum())
    if k == 0:
        sse = OBS_PRIOR_DF * OBS_PRIOR_GUESS ** 2 + e @ e
        sigma_obs2 = sse / (2.0 * rng.gamma((OBS_PRIOR_DF + n) / 2.0))
        return sigma_obs2, np.zeros(len(gamma))
    Xg = X[:, gamma]
    omega = prior_prec[np.ix_(gamma, gamma)]
    vn_inv = omega + Xg.T @ Xg
    vn = np.linalg.inv(vn_inv)
    bn = vn @ (Xg.T @ e)
    sse = OBS_PRIOR_DF * OBS_PRIOR_GUESS ** 2 + e @ e - bn @ vn_inv @ bn
    sigma_obs2 = sse / (2.0 * rng.gamma((OBS_PRIOR_DF + n) / 2.0))
    chol = np.linalg.cholesky(sigma_obs2 * vn)
    beta = np.zeros(X.shape[1])
    beta[gamma] = bn + chol @ rng.standard_normal(k)
    return sigma_obs2, beta


def _sample_level_var(mu, prior_guess, rng):
    diffs = np.diff(mu)
    df = LEVEL_PRIOR_DF + len(diffs)
    ss = LEVEL_PRIOR_DF * prior_guess ** 2 + diffs @ diffs
    for _ in range(100):
        draw = ss / (2.0 * rng.gamma(df / 2.0))
        if draw <= LEVEL_SD_UPPER ** 2:
            return draw
    return LEVEL_SD_UPPER ** 2


def gibbs_fit(y, X, niter, burn, prior_level_sd, seed, progress=None):
    """Run the Gibbs sampler on (standardized) pre-period data.

    Returns dict of post-burn-in draws.
    """
    rng = np.random.default_rng(seed)
    n = len(y)
    k = X.shape[1] if X is not None else 0
    if k:
        xtx = X.T @ X / n
        avg = (1.0 - DIAGONAL_SHRINKAGE) * xtx + \\
            DIAGONAL_SHRINKAGE * np.diag(np.diag(xtx))
        prior_prec = PRIOR_INFO_WEIGHT * avg
        gamma = np.ones(k, dtype=bool)
    else:
        prior_prec = np.zeros((0, 0))
        gamma = np.zeros(0, dtype=bool)

    beta = np.zeros(k)
    sigma_obs2 = OBS_PRIOR_GUESS ** 2
    sigma_level2 = prior_level_sd ** 2

    keep = niter - burn
    draws = {
        'mu': np.empty((keep, n)),
        'beta': np.empty((keep, k)),
        'gamma': np.empty((keep, k), dtype=bool),
        'sigma_obs2': np.empty(keep),
        'sigma_level2': np.empty(keep),
    }

    for it in range(niter):
        z = y - (X @ beta if k else 0.0)
        mu = _ffbs(z, sigma_obs2, sigma_level2, rng)
        sigma_level2 = _sample_level_var(mu, prior_level_sd, rng)
        e = y - mu
        if k:
            for j in range(k):
                gamma[j] = True
                log_in = _log_marginal(e, X, gamma, prior_prec)
                gamma[j] = False
                log_out = _log_marginal(e, X, gamma, prior_prec)
                p_in = 1.0 / (1.0 + np.exp(log_out - log_in))
                gamma[j] = rng.random() < p_in
        sigma_obs2, beta = _sample_regression(e, X, gamma, prior_prec, rng)

        if it >= burn:
            i = it - burn
            draws['mu'][i] = mu
            draws['beta'][i] = beta
            draws['gamma'][i] = gamma
            draws['sigma_obs2'][i] = sigma_obs2
            draws['sigma_level2'][i] = sigma_level2
        if progress is not None and (it + 1) % 50 == 0:
            progress(it + 1, niter)

    return draws


def posterior_predict(draws, X_post, n_post, seed):
    """Simulate the posterior predictive for the post period: (keep, n_post)."""
    rng = np.random.default_rng(seed + 1 if seed is not None else None)
    keep = draws['mu'].shape[0]
    level_sd = np.sqrt(draws['sigma_level2'])[:, None]
    obs_sd = np.sqrt(draws['sigma_obs2'])[:, None]
    steps = rng.standard_normal((keep, n_post)) * level_sd
    mu_paths = draws['mu'][:, -1:] + np.cumsum(steps, axis=1)
    reg = draws['beta'] @ X_post.T if X_post is not None and X_post.shape[1] else 0.0
    return mu_paths + reg + rng.standard_normal((keep, n_post)) * obs_sd


def fitted_pre(draws, X_pre, seed):
    """Posterior predictive for the pre period (in-sample): (keep, n_pre)."""
    rng = np.random.default_rng(seed + 2 if seed is not None else None)
    reg = draws['beta'] @ X_pre.T if X_pre is not None and X_pre.shape[1] else 0.0
    obs_sd = np.sqrt(draws['sigma_obs2'])[:, None]
    return draws['mu'] + reg + rng.standard_normal(draws['mu'].shape) * obs_sd
`,l=`"""JSON-in/JSON-out entrypoint for the web worker.

The JS side owns index semantics (dates, labels); everything here is positional.
Periods are inclusive integer positions into the data arrays.
"""

import json
import math

import numpy as np
import pandas as pd

import bayes
from causalimpact import CausalImpact
from causalimpact.misc import get_z_score
from causalimpact.summary import REPORT_TMPL, SUMMARY_TMPL

SERIES_COLUMNS = [
    'preds', 'preds_lower', 'preds_upper',
    'post_preds', 'post_preds_lower', 'post_preds_upper',
    'post_cum_y', 'post_cum_pred', 'post_cum_pred_lower', 'post_cum_pred_upper',
    'point_effects', 'point_effects_lower', 'point_effects_upper',
    'post_cum_effects', 'post_cum_effects_lower', 'post_cum_effects_upper',
]


def _clean(values):
    return [None if (v is None or (isinstance(v, float) and not math.isfinite(v))) else float(v)
            for v in values]


def _quantiles(draws_2d, alpha):
    lower = np.quantile(draws_2d, alpha / 2.0, axis=0)
    upper = np.quantile(draws_2d, 1.0 - alpha / 2.0, axis=0)
    return lower, upper


def run_bayes(payload):
    """Spike-and-slab Bayesian engine; same output contract as the MLE path."""
    y = np.asarray(payload['y'], dtype=float)
    covariates = payload.get('covariates') or {}
    n = len(y)
    X = None
    if covariates:
        X = np.column_stack([np.asarray(v, dtype=float) for v in covariates.values()])
        if X.shape[0] != n:
            raise ValueError('Covariate rows must match y.')
        if not np.isfinite(X).all():
            raise ValueError('Covariates cannot contain missing values.')
    if payload.get('nseasons'):
        raise ValueError('The Bayesian engine does not support seasonal components '
                         'yet; use the fast (MLE) engine for seasonal models.')

    p0, p1 = (int(v) for v in payload['pre_period'])
    q0, q1 = (int(v) for v in payload['post_period'])
    if p1 - p0 < 3:
        raise ValueError('pre_period must span at least 3 time points.')
    if q0 <= p1:
        raise ValueError('post_period must start after pre_period ends.')
    alpha = float(payload.get('alpha', 0.05))
    prior_level_sd = payload.get('prior_level_sd')
    prior_level_sd = 0.01 if prior_level_sd is None else float(prior_level_sd)
    niter = int(payload.get('niter', 1000))
    burn = int(payload.get('burn', max(100, niter // 5)))
    seed = payload.get('seed')
    seed = int(seed) if seed is not None else None
    progress = payload.get('_progress')

    y_pre, y_post = y[p0:p1 + 1], y[q0:q1 + 1]
    if not np.isfinite(y_pre).all() or not np.isfinite(y_post).all():
        raise ValueError('The Bayesian engine requires a response without '
                         'missing values in the pre and post periods.')
    mu_y, sd_y = y_pre.mean(), y_pre.std()
    if sd_y == 0:
        raise ValueError('Input response cannot be constant.')
    ys_pre = (y_pre - mu_y) / sd_y

    Xs_pre = Xs_post = None
    if X is not None:
        mu_x, sd_x = X[p0:p1 + 1].mean(axis=0), X[p0:p1 + 1].std(axis=0)
        sd_x[sd_x == 0] = 1.0
        Xs = (X - mu_x) / sd_x
        Xs_pre, Xs_post = Xs[p0:p1 + 1], Xs[q0:q1 + 1]

    draws = bayes.gibbs_fit(ys_pre, Xs_pre, niter, burn, prior_level_sd, seed,
                            progress=progress)
    pred_post = bayes.posterior_predict(draws, Xs_post, len(y_post), seed)
    pred_pre = bayes.fitted_pre(draws, Xs_pre, seed)

    # Back to the original scale.
    pred_post = pred_post * sd_y + mu_y
    pred_pre = pred_pre * sd_y + mu_y

    nan = np.full(n, np.nan)
    series = {name: nan.copy() for name in SERIES_COLUMNS}

    pre_idx = slice(p0, p1 + 1)
    post_idx = slice(q0, q1 + 1)

    pre_lower, pre_upper = _quantiles(pred_pre, alpha)
    post_lower, post_upper = _quantiles(pred_post, alpha)
    series['preds'][pre_idx] = pred_pre.mean(axis=0)
    series['preds'][post_idx] = pred_post.mean(axis=0)
    series['preds_lower'][pre_idx] = pre_lower
    series['preds_lower'][post_idx] = post_lower
    series['preds_upper'][pre_idx] = pre_upper
    series['preds_upper'][post_idx] = post_upper
    series['post_preds'][post_idx] = pred_post.mean(axis=0)
    series['post_preds_lower'][post_idx] = post_lower
    series['post_preds_upper'][post_idx] = post_upper

    observed = np.concatenate([y_pre, y_post])
    both_idx = np.r_[np.arange(p0, p1 + 1), np.arange(q0, q1 + 1)]
    series['point_effects'][both_idx] = observed - series['preds'][both_idx]
    series['point_effects_lower'][both_idx] = observed - series['preds_upper'][both_idx]
    series['point_effects_upper'][both_idx] = observed - series['preds_lower'][both_idx]

    # Cumulative series: a leading zero at the last pre-period point.
    cum_pred_draws = np.cumsum(pred_post, axis=1)
    cum_eff_draws = np.cumsum(y_post[None, :] - pred_post, axis=1)
    cum_lower, cum_upper = _quantiles(cum_pred_draws, alpha)
    ce_lower, ce_upper = _quantiles(cum_eff_draws, alpha)
    cum_idx = np.r_[p1, np.arange(q0, q1 + 1)]
    series['post_cum_y'][cum_idx] = np.r_[0.0, np.cumsum(y_post)]
    series['post_cum_pred'][cum_idx] = np.r_[0.0, cum_pred_draws.mean(axis=0)]
    series['post_cum_pred_lower'][cum_idx] = np.r_[0.0, cum_lower]
    series['post_cum_pred_upper'][cum_idx] = np.r_[0.0, cum_upper]
    series['post_cum_effects'][cum_idx] = np.r_[0.0, cum_eff_draws.mean(axis=0)]
    series['post_cum_effects_lower'][cum_idx] = np.r_[0.0, ce_lower]
    series['post_cum_effects_upper'][cum_idx] = np.r_[0.0, ce_upper]

    # Summary from posterior draws.
    n_post = len(y_post)
    sum_pred_draws = pred_post.sum(axis=1)
    sum_y = float(y_post.sum())
    mean_y = float(y_post.mean())
    avg_pred_draws = sum_pred_draws / n_post
    abs_avg_draws = mean_y - avg_pred_draws
    abs_sum_draws = sum_y - sum_pred_draws
    rel_draws = abs_sum_draws / sum_pred_draws

    def qpair(d):
        return float(np.quantile(d, alpha / 2.0)), float(np.quantile(d, 1.0 - alpha / 2.0))

    avg_pred_lo, avg_pred_hi = qpair(avg_pred_draws)
    sum_pred_lo, sum_pred_hi = qpair(sum_pred_draws)
    abs_avg_lo, abs_avg_hi = qpair(abs_avg_draws)
    abs_sum_lo, abs_sum_hi = qpair(abs_sum_draws)
    rel_lo, rel_hi = qpair(rel_draws)

    summary = {
        'average': {
            'actual': mean_y,
            'predicted': float(avg_pred_draws.mean()),
            'predicted_lower': avg_pred_lo,
            'predicted_upper': avg_pred_hi,
            'abs_effect': float(abs_avg_draws.mean()),
            'abs_effect_lower': abs_avg_lo,
            'abs_effect_upper': abs_avg_hi,
            'rel_effect': float(rel_draws.mean()),
            'rel_effect_lower': rel_lo,
            'rel_effect_upper': rel_hi,
        },
        'cumulative': {
            'actual': sum_y,
            'predicted': float(sum_pred_draws.mean()),
            'predicted_lower': sum_pred_lo,
            'predicted_upper': sum_pred_hi,
            'abs_effect': float(abs_sum_draws.mean()),
            'abs_effect_lower': abs_sum_lo,
            'abs_effect_upper': abs_sum_hi,
            'rel_effect': float(rel_draws.mean()),
            'rel_effect_lower': rel_lo,
            'rel_effect_upper': rel_hi,
        },
    }

    keep = sum_pred_draws.shape[0]
    tail = min(int((sum_pred_draws >= sum_y).sum()), int((sum_pred_draws <= sum_y).sum()))
    p_value = (tail + 1) / (keep + 1)

    tmpl_args = dict(summary=summary, alpha=alpha, p_value=p_value, digits=2)
    inclusion = (
        {name: float(p) for name, p in
         zip(covariates.keys(), draws['gamma'].mean(axis=0))}
        if covariates else {}
    )

    return {
        'ok': True,
        'series': {col: _clean(values.tolist()) for col, values in series.items()},
        'summary': summary,
        'p_value': float(p_value),
        'alpha': alpha,
        'summary_text': SUMMARY_TMPL.render(z_score=get_z_score(1 - alpha / 2.0), **tmpl_args),
        'report': REPORT_TMPL.render(**tmpl_args),
        'engine': 'bayes',
        'inclusion_probs': inclusion,
    }


def run(payload):
    if payload.get('engine') == 'bayes':
        return run_bayes(payload)
    y = payload['y']
    covariates = payload.get('covariates') or {}
    n = len(y)
    columns = {'y': y}
    for name, values in covariates.items():
        if len(values) != n:
            raise ValueError(f'Covariate {name!r} has {len(values)} rows, expected {n}.')
        columns[name] = values
    data = pd.DataFrame(columns, index=pd.RangeIndex(n), dtype=float)

    kwargs = {}
    if payload.get('nseasons'):
        kwargs['nseasons'] = [
            {k: int(v) for k, v in season.items()} for season in payload['nseasons']
        ]
    if 'standardize' in payload:
        kwargs['standardize'] = bool(payload['standardize'])
    if 'prior_level_sd' in payload:
        v = payload['prior_level_sd']
        kwargs['prior_level_sd'] = None if v is None else float(v)
    if payload.get('n_sims'):
        kwargs['n_sims'] = int(payload['n_sims'])

    seed = payload.get('seed')
    if seed is not None:
        kwargs['seed'] = int(seed)

    ci = CausalImpact(
        data,
        [int(p) for p in payload['pre_period']],
        [int(p) for p in payload['post_period']],
        alpha=float(payload.get('alpha', 0.05)),
        **kwargs,
    )

    inferences = ci.inferences.reindex(pd.RangeIndex(n))
    series = {col: _clean(inferences[col].tolist()) for col in SERIES_COLUMNS}

    summary = {
        scope: {k: float(v) for k, v in values.items()}
        for scope, values in ci.summary_data.to_dict().items()
    }

    return {
        'ok': True,
        'series': series,
        'summary': summary,
        'p_value': float(ci.p_value),
        'alpha': float(ci.alpha),
        'summary_text': ci.summary(),
        'report': ci.summary('report'),
        'engine': 'mle',
    }


def run_json(payload_json, progress=None):
    try:
        payload = json.loads(payload_json)
        if progress is not None:
            payload['_progress'] = progress
        result = run(payload)
    except Exception as e:  # surface any engine failure to the UI as a message
        result = {'ok': False, 'error': f'{type(e).__name__}: {e}'}
    return json.dumps(result)
`;let u=`https://cdn.jsdelivr.net/pyodide/v314.0.5/full/`,d={"/app/causalimpact/__init__.py":e,"/app/causalimpact/__version__.py":t,"/app/causalimpact/inferences.py":n,"/app/causalimpact/main.py":r,"/app/causalimpact/misc.py":i,"/app/causalimpact/summary.py":a,"/app/causalimpact/templates/report":o,"/app/causalimpact/templates/summary":s,"/app/bayes.py":c,"/app/runner.py":l};function f(e){self.postMessage(e)}let p=null;async function m(){f({type:`status`,stage:`loading-runtime`});let{loadPyodide:e}=await import(`${u}pyodide.mjs`),t=await e({indexURL:u});f({type:`status`,stage:`loading-packages`}),await t.loadPackage([`numpy`,`scipy`,`pandas`,`statsmodels`,`jinja2`]),f({type:`status`,stage:`installing`}),t.FS.mkdirTree(`/app/causalimpact/templates`);for(let[e,n]of Object.entries(d))t.FS.writeFile(e,n);return t.runPython(`import sys; sys.path.insert(0, '/app'); import runner`),t.runPython(`runner.run_json`)}self.onmessage=async e=>{let t=e.data;try{p||=m();let e=await p;if(t.type===`init`){f({type:`ready`});return}let n=JSON.parse(e(JSON.stringify(t.payload),(e,t)=>f({type:`progress`,done:e,total:t})));n.ok?(delete n.ok,f({type:`result`,result:n})):f({type:`error`,error:n.error})}catch(e){p=null,f({type:`error`,error:e instanceof Error?e.message:String(e)})}}})();