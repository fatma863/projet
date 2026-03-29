import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

let echoInstance = null;
let echoDisabled = false;

function createNoopEcho() {
  const noopChannel = {
    listen: () => noopChannel,
    stopListening: () => noopChannel,
  };

  return {
    private: () => noopChannel,
    leave: () => {},
    disconnect: () => {},
  };
}

function buildOptions() {
  const token = localStorage.getItem('token');
  const driver = import.meta.env.VITE_BROADCAST_DRIVER || 'reverb';
  const useReverb = driver === 'reverb';
  const key = useReverb ? import.meta.env.VITE_REVERB_APP_KEY : import.meta.env.VITE_PUSHER_APP_KEY;

  return {
    broadcaster: 'pusher',
    key,
    wsHost: useReverb
      ? import.meta.env.VITE_REVERB_HOST || window.location.hostname
      : import.meta.env.VITE_PUSHER_HOST || `ws-${import.meta.env.VITE_PUSHER_APP_CLUSTER}.pusher.com`,
    wsPort: Number(useReverb ? import.meta.env.VITE_REVERB_PORT || 80 : import.meta.env.VITE_PUSHER_PORT || 443),
    wssPort: Number(useReverb ? import.meta.env.VITE_REVERB_PORT || 443 : import.meta.env.VITE_PUSHER_PORT || 443),
    forceTLS: (useReverb ? import.meta.env.VITE_REVERB_SCHEME : import.meta.env.VITE_PUSHER_SCHEME) === 'https',
    enabledTransports: ['ws', 'wss'],
    cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER || 'mt1',
    authEndpoint: '/api/broadcasting/auth',
    auth: {
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
        Accept: 'application/json',
      },
    },
  };
}

export function getEcho() {
  if (echoInstance) return echoInstance;
  if (echoDisabled) return createNoopEcho();

  const options = buildOptions();
  if (!options.key) {
    echoDisabled = true;
    return createNoopEcho();
  }

  try {
    window.Pusher = Pusher;
    echoInstance = new Echo(options);
  } catch {
    echoDisabled = true;
    return createNoopEcho();
  }

  return echoInstance;
}

export function disconnectEcho() {
  if (!echoInstance) return;
  echoInstance.disconnect();
  echoInstance = null;
}
