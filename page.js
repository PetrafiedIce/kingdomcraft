(function(){
  const body = document.body;
  const theme = body.getAttribute('data-theme') || 'realm';
  const title = document.querySelector('.kc-page h1');
  const subtitle = document.querySelector('.kc-page p');
  const cta = document.querySelector('.kc-link-home');

  // Optional: subtle arrival sound
  try {
    if (typeof Howl !== 'undefined') {
      const chime = new Howl({ src: ['https://cdn.pixabay.com/download/audio/2022/10/19/audio_bf87f21b54.mp3?filename=ui-confirmation-257729.mp3'], volume: 0.35 });
      chime.play();
    }
  } catch (e) {}

  // Themed background accent via CSS custom props
  const themes = {
    castle:   ['#d1b87f', '#6d5932'],
    join:     ['#b388ff', '#4b2a7c'],
    rules:    ['#e5c88c', '#614f2a'],
    shop:     ['#ffd54f', '#523f08'],
    forums:   ['#b0bec5', '#22313a'],
    map:      ['#d7ccc8', '#3b2a25'],
    realm:    ['#d1b87f', '#1c2439']
  };
  const [accent, deep] = themes[theme] || themes.realm;
  document.documentElement.style.setProperty('--accent', accent);
  document.body.style.backgroundImage = `radial-gradient(1000px circle at 20% 30%, ${deep}55, transparent 60%), radial-gradient(1000px circle at 80% 70%, ${accent}22, transparent 60%)`;

  // Entry animation
  gsap.set([title, subtitle, cta], { opacity: 0, y: 10, filter: 'blur(3px)' });
  const tl = gsap.timeline();
  tl.to(title, { duration: 0.6, opacity: 1, y: 0, filter: 'blur(0px)', ease: 'power3.out' })
    .to(subtitle, { duration: 0.6, opacity: 1, y: 0, filter: 'blur(0px)', ease: 'power3.out' }, '-=0.25')
    .to(cta, { duration: 0.6, opacity: 1, y: 0, filter: 'blur(0px)', ease: 'power3.out' }, '-=0.35');
})();