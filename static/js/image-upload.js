/**
 * Image upload zones: preview before save, multipart upload to /api/upload/image
 */
(function () {
  const MAX_SIZE = 2 * 1024 * 1024;
  const ALLOWED = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  function showPreview(zone, file, hiddenInput) {
    const preview = zone.querySelector('[data-upload-preview]');
    if (!preview) return;

    const reader = new FileReader();
    reader.onload = function (e) {
      let img = preview.querySelector('img');
      if (!img) {
        img = document.createElement('img');
        img.alt = 'Preview';
        preview.appendChild(img);
      }
      img.src = e.target.result;
      preview.classList.add('visible');
    };
    reader.readAsDataURL(file);

    uploadFile(file, hiddenInput, zone);
  }

  async function uploadFile(file, hiddenInput, zone) {
    const status = zone.querySelector('[data-upload-status]');
    if (status) status.textContent = 'Uploading…';

    const target = hiddenInput
      || zone.closest('form')?.querySelector('[data-room-image-url]')
      || zone.closest('form')?.querySelector('input[name="image_url"]');

    const form = new FormData();
    form.append('image', file);

    try {
      const res = await fetch('/api/upload/image', {
        method: 'POST',
        body: form,
        credentials: 'same-origin',
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || 'Upload failed');
      }
      if (target) target.value = data.url;
      if (status) status.textContent = 'Ready to save';
      if (typeof showToast === 'function') showToast('Image uploaded', 'success');
    } catch (err) {
      if (status) status.textContent = err.message || 'Upload failed';
      if (typeof showToast === 'function') showToast(err.message || 'Upload failed', 'danger');
    }
  }

  function validate(file) {
    if (!ALLOWED.includes(file.type)) {
      return 'Use JPG, PNG, or WebP images only.';
    }
    if (file.size > MAX_SIZE) {
      return 'Image must be under 2 MB.';
    }
    return null;
  }

  function bindZone(zone) {
    const input = zone.querySelector('input[type="file"]');
    if (!input) return;

    input.addEventListener('change', function () {
      const file = input.files && input.files[0];
      if (!file) return;
      const err = validate(file);
      if (err) {
        if (typeof showToast === 'function') showToast(err, 'danger');
        input.value = '';
        return;
      }
      showPreview(zone, file, zone.querySelector('[data-upload-url]'));
    });

    zone.addEventListener('dragover', function (e) {
      e.preventDefault();
      zone.classList.add('dragover');
    });
    zone.addEventListener('dragleave', function () {
      zone.classList.remove('dragover');
    });
    zone.addEventListener('drop', function (e) {
      e.preventDefault();
      zone.classList.remove('dragover');
      const file = e.dataTransfer.files && e.dataTransfer.files[0];
      if (!file) return;
      const err = validate(file);
      if (err) {
        if (typeof showToast === 'function') showToast(err, 'danger');
        return;
      }
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      showPreview(zone, file, zone.querySelector('[data-upload-url]'));
    });
  }

  document.querySelectorAll('[data-image-upload]').forEach(bindZone);
})();
