/* Light/dark for every apps/landing page. Loaded with `defer`, so the DOM is
   parsed by the time this runs and the button can be wired by id.

   The choice is stored under `ab-theme` and read back on every page, so the
   toggle is site-wide, not per-page. With no stored choice the system
   preference wins — style.css already renders that state through its
   prefers-color-scheme block, so the attribute set here only has to agree. */
;(function () {
  var saved = null
  try { saved = localStorage.getItem('ab-theme') } catch (e) {}
  var theme = saved || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')

  function apply () {
    document.documentElement.setAttribute('data-theme', theme)
    var b = document.getElementById('themebtn')
    if (b) b.textContent = theme === 'dark' ? '◑ light' : '◐ dark'
  }

  apply()

  var btn = document.getElementById('themebtn')
  if (btn) btn.addEventListener('click', function () {
    theme = theme === 'dark' ? 'light' : 'dark'
    try { localStorage.setItem('ab-theme', theme) } catch (e) {}
    apply()
  })
})()
