console.log('Service Worker Register File...');

if ('serviceWorker' in navigator) {
  window.addEventListener('load', handleWindowLoad);
}

function handleWindowLoad() {
  onWindowLoad();
}

async function onWindowLoad() {
  await navigator.serviceWorker
    .register(new URL('./sw.js', import.meta.url), {
      type: 'module'
    })
    .then(registerSW)
    .catch(showError);
}

function registerSW(registration) {
  console.log('Service Worker Registered: ', registration);
}

function showError(error) {
  console.warn('Service Worker Registration Failed: ', error);
}
