/*
 * Pamella's digital business card (/card). Kept out of the page itself because
 * the deployed CSP only allows scripts from 'self'. Everything here is an
 * enhancement: the call, email, contact and download links all work without it.
 */
(function () {
  var toast = document.getElementById('toast');
  var toastTimer;
  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('show'); }, 2200);
  }

  function copy(value, done) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(value).then(function () {
        showToast(done);
      }).catch(function () {
        showToast(value);
      });
    } else {
      showToast(value);
    }
  }

  document.getElementById('save-contact').addEventListener('click', function () {
    showToast('Contact card downloaded');
  });

  var share = document.getElementById('share-card');
  var cardUrl = location.origin + '/card';
  share.addEventListener('click', function () {
    if (navigator.share) {
      navigator.share({ title: 'Pamella Grear — Author and Speaker', url: cardUrl }).catch(function () {});
    } else {
      copy(cardUrl, 'Card link copied');
    }
  });

  Array.prototype.forEach.call(document.querySelectorAll('.copy-handle'), function (button) {
    button.addEventListener('click', function () {
      var value = button.getAttribute('data-copy');
      copy(value, value + ' copied');
    });
  });
}());
