document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('generator-form');
  const generateBtn = document.getElementById('generate-btn');
  const spinner = document.getElementById('loading-spinner');
  const resultContainer = document.getElementById('result-container');
  const errorContainer = document.getElementById('error-container');
  const errorText = document.getElementById('error-text');
  const downloadLink = document.getElementById('download-link');

  let currentTaskId = null;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    spinner.classList.remove('hidden');
    resultContainer.classList.add('hidden');
    errorContainer.classList.add('hidden');
    generateBtn.disabled = true;

    const formData = new FormData(form);
    try {
      const response = await fetch('/generate', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Request failed');
      currentTaskId = data.task_id;
      pollTaskStatus(currentTaskId);
    } catch (err) {
      showError(err.message);
      generateBtn.disabled = false;
    }
  });

  async function pollTaskStatus(taskId) {
    try {
      const resp = await fetch(`/status/${taskId}`);
      const data = await resp.json();
      if (data.status === 'done') {
        fetchResult(taskId);
      } else if (data.status === 'error') {
        throw new Error(data.error_detail || 'Task failed on server');
      } else {
        setTimeout(() => pollTaskStatus(taskId), 60000);
      }
    } catch (err) {
      showError(err.message);
      generateBtn.disabled = false;
    }
  }

  async function fetchResult(taskId) {
    try {
      const resp = await fetch(`/result/${taskId}`);
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Result not ready');

      const files = data.files || {};

      // Ищем нужные документы по относительным путям
      const functionalReq = files['docs/functional-req.md'] || files['functional-req.md'] || '';
      const nonFunctionalReq = files['docs/non-functional-req.md'] || files['non-functional-req.md'] || '';
      const useCases = files['docs/use-cases.md'] || files['use-cases.md'] || '';
      const readme = files['readme.md'] || '';

      // Рендерим Markdown -> HTML
      document.getElementById('functional-req').innerHTML = marked.parse(functionalReq);
      document.getElementById('non-functional-req').innerHTML = marked.parse(nonFunctionalReq);
      document.getElementById('use-cases').innerHTML = marked.parse(useCases);
      document.getElementById('readme').innerHTML = marked.parse(readme);

      // Устанавливаем ссылку на скачивание
      downloadLink.href = `/download/${currentTaskId}`;

      showResult();
      const docsWrapper = document.querySelector('.docs-wrapper');
      if (docsWrapper) {
        docsWrapper.addEventListener('click', (e) => {
          const header = e.target.closest('.collapsible-header');
          if (!header) return;
          header.classList.toggle('collapsed');
          const content = header.nextElementSibling;
          if (content) {
            content.classList.toggle('hidden');
          }
        });
      }
    } catch (err) {
      showError(err.message);
    } finally {
      generateBtn.disabled = false;
    }
    
  }

  function showResult() {
    spinner.classList.add('hidden');
    resultContainer.classList.remove('hidden');
  }

  function showError(message) {
    spinner.classList.add('hidden');
    resultContainer.classList.add('hidden');
    errorContainer.classList.remove('hidden');
    errorText.textContent = message;
  }
}
);