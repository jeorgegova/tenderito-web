export interface ToastPayload {
  title: string;
  message?: string;
  body?: string;
  type?: 'success' | 'info' | 'warning';
}

export function showToast(titleOrPayload: string | ToastPayload, message?: string): void {
  if (typeof window === 'undefined') return;

  let title = '';
  let body = '';

  if (typeof titleOrPayload === 'object' && titleOrPayload !== null) {
    title = titleOrPayload.title;
    body = titleOrPayload.message || titleOrPayload.body || '';
  } else {
    title = titleOrPayload;
    body = message || '';
  }

  window.dispatchEvent(
    new CustomEvent('tenderito-in-app-notification', {
      detail: {
        title,
        body,
      },
    }),
  );
}
