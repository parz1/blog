// The Chinese and Japanese body faces are a long list of small slices. The
// list is fetched once the page is running rather than in front of it: text
// shows in the system's serif first and swaps once its slices arrive.
export default defineNuxtPlugin(() => {
  void import('~/assets/css/cjk-fonts.css')
})
