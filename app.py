import os
import io
import uuid
import threading
import zipfile
import tempfile
import traceback
from config.settings import settings
from flask import Flask, render_template, request, jsonify, send_file, Response

from core.orchestrator import Orchestrator

app = Flask(__name__)
app.secret_key = settings.OPENROUTER_API_KEY

tasks = {}


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/generate', methods=['POST'])
def generate():
    bt_text = request.form.get('bt_text', '').strip()
    bp_text = request.form.get('bp_text', '').strip()
    features_text = request.form.get('features_text', '').strip()

    bt = _read_upload_or_text('bt_file', bt_text)
    bp = _read_upload_or_text('bp_file', bp_text)
    features = _read_upload_or_text('features_file', features_text)

    if not bt or not bp:
        return jsonify({'error': 'Business Process and Business Requirements are required.'}), 400

    task_id = str(uuid.uuid4())
    tasks[task_id] = {'status': 'running', 'result': None, 'error': None}

    thread = threading.Thread(target=_run_generation, args=(task_id, bt, bp, features))
    thread.start()

    return jsonify({'task_id': task_id})


@app.route('/status/<task_id>')
def status(task_id):
    task = tasks.get(task_id)
    if not task:
        return jsonify({'error': 'Task not found'}), 404
    response = {'status': task['status']}
    if task['status'] == 'error':
        response['error_detail'] = task.get('error', 'Unknown error')
    return jsonify(response)


@app.route('/result/<task_id>')
def result(task_id):
    task = tasks.get(task_id)
    if not task or task['status'] != 'done':
        return jsonify({'error': 'Result not ready'}), 404

    print(task)
    files = task['result']['files']
    preview = {}
    for rel_path, content in files.items():
        lower = rel_path.lower()
        if lower.endswith('\\functional-req.md'):
            preview['functional-req.md'] = content
        elif lower.endswith('\\non-functional-req.md'):
            preview['non-functional-req.md'] = content
        elif lower.endswith('\\use-cases.md'):
            preview['use-cases.md'] = content
        elif lower.endswith("readme.md"):
            preview['readme.md'] = content

    return jsonify({
        'files': preview,
    })


@app.route('/download/<task_id>')
def download(task_id):
    task = tasks.get(task_id)
    if not task or task['status'] != 'done':
        return jsonify({'error': 'Download not available'}), 404

    mem_zip = io.BytesIO()
    with zipfile.ZipFile(mem_zip, 'w', zipfile.ZIP_DEFLATED) as zf:
        for rel_path, content in task['result']['files'].items():
            zf.writestr(rel_path, content)
    mem_zip.seek(0)
    return send_file(
        mem_zip,
        mimetype='application/zip',
        as_attachment=True,
        download_name='output.zip'
    )


def _read_upload_or_text(file_field, text_value):
    if file_field in request.files and request.files[file_field].filename != '':
        try:
            return request.files[file_field].read().decode('utf-8')
        except Exception:
            return text_value
    return text_value


def _run_generation(task_id, bt, bp, features):
    input_dir = None
    output_dir = None
    try:
        input_dir = tempfile.mkdtemp(prefix='input_')
        output_dir = tempfile.mkdtemp(prefix='output_')

        # Имена файлов точно как ожидает core.file_utils.read_input_files
        with open(os.path.join(input_dir, 'БТ.md'), 'w', encoding='utf-8') as f:
            f.write(bt)
        with open(os.path.join(input_dir, 'БП.md'), 'w', encoding='utf-8') as f:
            f.write(bp)
        with open(os.path.join(input_dir, 'Features.md'), 'w', encoding='utf-8') as f:
            f.write(features if features else '')

        orchestrator = Orchestrator(input_dir=input_dir, output_dir=output_dir)
        orchestrator.run()

        files = {}
        for root, _, filenames in os.walk(output_dir):
            for filename in filenames:
                filepath = os.path.join(root, filename)
                rel_path = os.path.relpath(filepath, output_dir)
                try:
                    with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
                        content = f.read()
                    files[rel_path] = content
                except Exception:
                    pass

        tasks[task_id] = {
            'status': 'done',
            'result': {'files': files},
            'error': None
        }

    except Exception as e:
        error_message = f"{str(e)}\n{traceback.format_exc()}"
        print(f"TASK {task_id} FAILED:\n{error_message}")
        tasks[task_id] = {
            'status': 'error',
            'error': error_message,
            'result': None
        }
    # временные папки не удаляем сразу, они самоочистятся при перезапуске или по таймеру


if __name__ == '__main__':
    app.run(debug=True, threaded=True)
