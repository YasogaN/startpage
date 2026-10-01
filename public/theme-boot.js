// Runs before first paint (classic, blocking, same-origin) to apply the saved
// theme without a flash. Kept as an external file so the Content-Security-Policy
// can stay at script-src 'self' with no inline-script hash to maintain.
;(function () {
  try {
    var saved = JSON.parse(
      localStorage.getItem('startpage.settings.v1') || '{}'
    )
    var dark =
      saved.theme === 'system'
        ? !window.matchMedia ||
          window.matchMedia('(prefers-color-scheme: dark)').matches
        : saved.theme !== 'light'
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
  } catch (error) {
    document.documentElement.dataset.theme = 'dark'
  }
})()
