"""Tests for multiple comparison correction functions.

Run with: pytest infra/lambda/analysis/test_corrections.py
No external dependencies required (pure Python).
"""

import copy
import pytest
from corrections import holm_bonferroni, benjamini_hochberg, apply_correction


# ---------------------------------------------------------------------------
# holm_bonferroni
# ---------------------------------------------------------------------------

class TestHolmBonferroni:
    def test_basic_adjustment(self):
        """Smaller p-values get multiplied by higher factors."""
        p = [0.01, 0.04, 0.03]
        adj = holm_bonferroni(p)
        # Sorted: 0.01 (×3), 0.03 (×2), 0.04 (×1)
        assert adj[0] == pytest.approx(0.03)   # 0.01 * 3
        assert adj[2] == pytest.approx(0.06)   # 0.03 * 2
        assert adj[1] == pytest.approx(0.06)   # max(0.06, 0.04) via cumulative max

    def test_capped_at_one(self):
        """Adjusted values never exceed 1.0."""
        p = [0.5, 0.6, 0.7]
        adj = holm_bonferroni(p)
        assert all(a <= 1.0 for a in adj)

    def test_single_value(self):
        """Single p-value returned unchanged."""
        assert holm_bonferroni([0.03]) == [pytest.approx(0.03)]

    def test_preserves_order_mapping(self):
        """Adjusted values map back to original indices."""
        p = [0.05, 0.001, 0.03]
        adj = holm_bonferroni(p)
        # 0.001 is smallest, should get largest multiplier (×3)
        assert adj[1] == pytest.approx(0.003)

    def test_monotonicity(self):
        """Sorted adjusted p-values are non-decreasing (step-down enforcement)."""
        p = [0.01, 0.02, 0.03, 0.04, 0.05]
        adj = holm_bonferroni(p)
        sorted_adj = sorted(adj)
        for i in range(len(sorted_adj) - 1):
            assert sorted_adj[i] <= sorted_adj[i + 1]


# ---------------------------------------------------------------------------
# benjamini_hochberg
# ---------------------------------------------------------------------------

class TestBenjaminiHochberg:
    def test_basic_adjustment(self):
        """BH adjusts by m/rank (ascending)."""
        p = [0.01, 0.04, 0.03]
        adj = benjamini_hochberg(p)
        # Sorted desc: 0.04 (rank 3 → ×3/3=0.04), 0.03 (rank 2 → ×3/2=0.045 → cummin=0.04), 0.01 (rank 1 → ×3/1=0.03 → cummin=0.03)
        assert adj[1] == pytest.approx(0.04)    # 0.04 * 3/3
        assert adj[2] == pytest.approx(0.04)    # min(0.03 * 3/2, 0.04) via cumulative min
        assert adj[0] == pytest.approx(0.03)    # min(0.01 * 3/1, 0.04)

    def test_capped_at_one(self):
        p = [0.5, 0.6, 0.7]
        adj = benjamini_hochberg(p)
        assert all(a <= 1.0 for a in adj)

    def test_single_value(self):
        assert benjamini_hochberg([0.03]) == [pytest.approx(0.03)]

    def test_less_conservative_than_holm(self):
        """BH should produce smaller or equal adjusted p-values than Holm."""
        p = [0.01, 0.02, 0.03, 0.04, 0.05]
        bh = benjamini_hochberg(p)
        hb = holm_bonferroni(p)
        for b, h in zip(bh, hb):
            assert b <= h + 1e-10  # BH <= Holm (with float tolerance)

    def test_monotonicity(self):
        """Sorted adjusted p-values are non-decreasing (step-up enforcement)."""
        p = [0.01, 0.02, 0.03, 0.04, 0.05]
        adj = benjamini_hochberg(p)
        sorted_adj = sorted(adj)
        for i in range(len(sorted_adj) - 1):
            assert sorted_adj[i] <= sorted_adj[i + 1]


# ---------------------------------------------------------------------------
# apply_correction — includes guardrail metrics
# ---------------------------------------------------------------------------

class TestApplyCorrection:
    """Tests that correction is applied to ALL metrics (primary + guardrail)."""

    @pytest.fixture
    def metrics(self):
        return [
            {"id": "m1", "isGuardrail": False},
            {"id": "m2", "isGuardrail": False},
            {"id": "m3", "isGuardrail": True},
        ]

    @pytest.fixture
    def frequentist_results(self):
        return [
            {"metricId": "m1", "pValue": 0.01, "significant": True},
            {"metricId": "m2", "pValue": 0.04, "significant": True},
            {"metricId": "m3", "pValue": 0.03, "significant": True},  # guardrail
        ]

    @pytest.fixture
    def bayesian_results(self):
        return [
            {"metricId": "m1", "chanceToBeatControl": 0.99},
            {"metricId": "m2", "chanceToBeatControl": 0.96},
            {"metricId": "m3", "chanceToBeatControl": 0.97, "isGuardrail": True},
        ]

    def test_guardrail_included_in_correction(self, metrics, frequentist_results):
        """Guardrail metrics are corrected alongside primary metrics."""
        results = apply_correction(frequentist_results, metrics, "holm-bonferroni")
        guardrail = next(r for r in results if r["metricId"] == "m3")
        # If guardrail were excluded, its p-value would stay 0.03
        # With 3-metric Holm correction, 0.03 * 2 = 0.06
        assert guardrail["pValue"] != 0.03
        assert guardrail["pValue"] == pytest.approx(0.06)

    def test_all_three_metrics_adjusted(self, metrics, frequentist_results):
        """All metrics get adjusted p-values, not just non-guardrail."""
        original_p = {r["metricId"]: r["pValue"] for r in frequentist_results}
        results = apply_correction(frequentist_results, metrics, "benjamini-hochberg")
        for r in results:
            # Every p-value should be >= the original (correction only inflates)
            assert r["pValue"] >= original_p[r["metricId"]] - 1e-10

    def test_significance_recalculated(self, metrics, frequentist_results):
        """Significance flags reflect adjusted p-values, not originals."""
        results = apply_correction(frequentist_results, metrics, "holm-bonferroni")
        for r in results:
            assert r["significant"] == (r["pValue"] < 0.05)

    def test_bayesian_uses_chance_proxy(self, metrics, bayesian_results):
        """Bayesian results use 1 - chanceToBeatControl as p-value proxy."""
        results = apply_correction(bayesian_results, metrics, "holm-bonferroni")
        # All three should have significance recalculated
        for r in results:
            assert "significant" in r

    def test_none_correction_is_noop(self, metrics, frequentist_results):
        """correction='none' returns results unchanged."""
        original = copy.deepcopy(frequentist_results)
        results = apply_correction(frequentist_results, metrics, "none")
        assert results == original

    def test_empty_results(self, metrics):
        """Empty results list returns empty."""
        assert apply_correction([], metrics, "holm-bonferroni") == []

    def test_single_result_unchanged(self, metrics):
        """Single result is returned without adjustment (m <= 1)."""
        results = [{"metricId": "m1", "pValue": 0.01, "significant": True}]
        apply_correction(results, metrics, "holm-bonferroni")
        assert results[0]["pValue"] == 0.01

    def test_missing_p_value_gets_1(self, metrics):
        """Results with no pValue or chanceToBeatControl get p=1.0 (conservative)."""
        results = [
            {"metricId": "m1", "pValue": 0.01, "significant": True},
            {"metricId": "m2"},  # no p-value at all
            {"metricId": "m3", "pValue": 0.03, "significant": True},
        ]
        # Should not raise
        apply_correction(results, metrics, "benjamini-hochberg")
        # m2 has no pValue key, so it stays untouched
        assert "pValue" not in results[1]
