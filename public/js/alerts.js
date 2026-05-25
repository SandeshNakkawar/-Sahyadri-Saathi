/* eslint-disable */

export const hideAlert = () => {
  const el = document.querySelector('.alert');
  if (el) el.parentElement.removeChild(el);
};

// type is 'success' or 'error'
export const showAlert = (type, msg) => {
  hideAlert();
  
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert--${type}`;
  alertDiv.textContent = msg;
  
  document.querySelector('body').appendChild(alertDiv);
  window.setTimeout(hideAlert, 5000);
};
