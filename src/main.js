const STORAGE_KEY = 'workflow-platform-state-v2';
const nowText = () => new Date().toLocaleString('zh-CN', { hour12: false });

const operatorCatalog = [
  { type: 'start', label: '开始', icon: '▶', description: '定义工作流入口参数', logic: 'workflow.start' },
  { type: 'condition', label: '条件判断', icon: '⌁', description: '按表达式选择执行路径', logic: 'logic.ifElse' },
  { type: 'tool', label: '工具调用', icon: '⚒', description: '调用外部工具或模型能力', logic: 'tool.invoke' },
  { type: 'function', label: '函数处理', icon: 'ƒ', description: '运行内置或自定义函数', logic: 'function.execute' },
  { type: 'data', label: '数据映射', icon: '◇', description: '转换、提取或合并上下文数据', logic: 'data.map' },
  { type: 'publish', label: '发布', icon: '🚀', description: '将工作流发布为 API 或任务', logic: 'workflow.publish' },
];

const functionLibrary = [
  { name: '文本摘要', key: 'text.summarize', signature: 'summary(input, length)', description: '把长文本压缩为指定长度摘要' },
  { name: '字段提取', key: 'json.pick', signature: 'pick(object, paths)', description: '按路径从 JSON 中提取字段' },
  { name: '列表过滤', key: 'array.filter', signature: 'filter(list, predicate)', description: '根据条件保留列表元素' },
  { name: '结果评分', key: 'score.rank', signature: 'rank(items, rules)', description: '按规则为候选结果排序' },
];

const toolRegistry = [
  { name: 'HTTP 请求', key: 'http.request', auth: 'API Key', status: '已配置', description: '访问 REST API，支持 GET/POST/PUT/DELETE' },
  { name: '数据库查询', key: 'db.query', auth: '连接串', status: '待授权', description: '执行只读 SQL 查询并返回结构化结果' },
  { name: '大模型调用', key: 'llm.chat', auth: '模型密钥', status: '已配置', description: '调用对话模型完成生成、分类和抽取' },
  { name: '消息通知', key: 'notify.send', auth: 'Webhook', status: '待授权', description: '向企业微信、飞书或 Slack 发送通知' },
];

const defaultState = {
  nodes: [
    { id: 1, type: 'start', title: '接收需求', config: '输入：业务目标、用户画像、约束条件', enabled: true },
    { id: 2, type: 'tool', title: '检索知识库', config: '工具：http.request / knowledge.search', enabled: true },
    { id: 3, type: 'function', title: '整理候选方案', config: '函数：json.pick + score.rank', enabled: true },
    { id: 4, type: 'publish', title: '发布为接口', config: '输出：/api/workflows/{id}/run', enabled: true },
  ],
  selectedType: 'tool',
  workflowName: '智能业务流程编排',
  publishMode: 'API 服务',
  endpoint: '',
  version: 'v1.0.0',
  draftSavedAt: '',
  publishedAt: '',
  runLog: ['系统已就绪：可编辑节点、保存草稿、发布并模拟运行。'],
};

let state = loadState();
const root = document.getElementById('root');
const getOperator = (type) => operatorCatalog.find((item) => item.type === type) ?? operatorCatalog[0];
const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
const slugify = (value) => encodeURIComponent(value.trim().toLowerCase().replace(/\s+/g, '-')).replace(/%/g, '').slice(0, 32) || 'workflow';

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return saved ? { ...defaultState, ...saved } : { ...defaultState };
  } catch {
    return { ...defaultState };
  }
}

function persistState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getValidation() {
  const errors = [];
  if (!state.workflowName.trim()) errors.push('工作流名称不能为空');
  if (state.nodes.length === 0) errors.push('至少需要 1 个节点');
  if (!state.nodes.some((node) => node.type === 'start')) errors.push('缺少“开始”节点');
  if (!state.nodes.some((node) => node.type === 'publish')) errors.push('缺少“发布”节点');
  state.nodes.forEach((node, index) => {
    if (!node.title.trim()) errors.push(`第 ${index + 1} 个节点标题不能为空`);
    if (!node.config.trim()) errors.push(`第 ${index + 1} 个节点配置不能为空`);
  });
  return { ok: errors.length === 0, errors };
}

function getPayload() {
  return {
    name: state.workflowName,
    mode: state.publishMode,
    version: state.version,
    endpoint: state.endpoint || `/api/workflows/${slugify(state.workflowName)}/run`,
    publishedAt: state.publishedAt || null,
    nodes: state.nodes.filter((node) => node.enabled).map((node, index) => ({
      order: index + 1,
      operator: getOperator(node.type).label,
      logic: getOperator(node.type).logic,
      title: node.title,
      config: node.config,
    })),
  };
}

function addLog(message) {
  state.runLog = [`${nowText()} ${message}`, ...state.runLog].slice(0, 8);
}

function saveDraft() {
  state.draftSavedAt = nowText();
  persistState();
  addLog('草稿已保存到浏览器本地存储。');
  render();
}

function publishWorkflow() {
  const validation = getValidation();
  if (!validation.ok) {
    addLog(`发布失败：${validation.errors.join('；')}`);
    render();
    return;
  }
  state.publishedAt = nowText();
  state.endpoint = `/api/workflows/${slugify(state.workflowName)}/run`;
  persistState();
  addLog(`发布成功：${state.endpoint}`);
  render();
}

function runWorkflow() {
  const validation = getValidation();
  if (!validation.ok) {
    addLog(`运行失败：${validation.errors.join('；')}`);
    render();
    return;
  }
  const steps = getPayload().nodes.map((node) => `${node.order}.${node.operator}(${node.logic})`).join(' → ');
  addLog(`模拟运行完成：${steps}`);
  persistState();
  render();
}

function exportWorkflow() {
  const blob = new Blob([JSON.stringify(getPayload(), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${slugify(state.workflowName)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
  addLog('已导出发布配置 JSON。');
  render();
}

function renderOperators() {
  return operatorCatalog.map((operator) => `
    <button class="operator ${state.selectedType === operator.type ? 'active' : ''}" data-select="${operator.type}">
      <span>${operator.icon}</span><span>${operator.label}</span><small>${operator.logic}</small>
    </button>`).join('');
}

function renderNodes() {
  return state.nodes.map((node, index) => {
    const operator = getOperator(node.type);
    return `
      <article class="flow-node ${node.enabled ? '' : 'disabled'}">
        <div class="node-index">${index + 1}</div>
        <div class="node-icon">${operator.icon}</div>
        <div class="node-body">
          <div class="node-meta"><span>${operator.label}</span><code>${operator.logic}</code><label><input type="checkbox" data-field="enabled" data-id="${node.id}" ${node.enabled ? 'checked' : ''} /> 启用</label></div>
          <input value="${escapeHtml(node.title)}" data-field="title" data-id="${node.id}" aria-label="${operator.label}标题" />
          <textarea data-field="config" data-id="${node.id}" aria-label="${operator.label}配置">${escapeHtml(node.config)}</textarea>
        </div>
        <button class="icon-button" data-delete="${node.id}" aria-label="删除节点">×</button>
      </article>`;
  }).join('');
}

function renderValidation() {
  const validation = getValidation();
  if (validation.ok) return '<div class="status good">✅ 校验通过，可以发布或运行</div>';
  return `<div class="status bad">⚠️ ${validation.errors.map(escapeHtml).join('；')}</div>`;
}

function renderRegistry(items, mapper) {
  return items.map(mapper).join('');
}

function render() {
  const payload = JSON.stringify(getPayload(), null, 2);
  root.innerHTML = `
    <main class="app-shell">
      <section class="hero">
        <div><span class="eyebrow">Workflow Builder</span><h1>工作流搭建、工具调用与发布平台</h1><p>用简单中文操作符搭建流程，平台内部封装逻辑函数、工具适配器、草稿保存、发布校验和运行模拟，帮助业务人员与开发人员共同交付自动化应用。</p><div class="hero-actions"><button class="primary" id="save-draft">💾 保存草稿</button><button class="secondary" id="publish-workflow">🚀 发布工作流</button><button class="secondary" id="run-workflow">▶ 模拟运行</button></div></div>
        <div class="publish-card"><div class="card-title">✅ 发布清单</div><ul><li>节点校验：${state.nodes.length} 个操作符 / ${state.nodes.filter((node) => node.enabled).length} 个已启用</li><li>草稿时间：${state.draftSavedAt || '尚未保存'}</li><li>发布地址：${state.endpoint || '发布后自动生成'}</li></ul>${renderValidation()}</div>
      </section>
      <section class="workspace">
        <aside class="panel palette"><h2>中文操作符</h2><p>前台显示为业务可理解的中文名称，后台映射到稳定逻辑函数。</p><div class="operator-list">${renderOperators()}</div><button class="add-node" id="add-node">＋ 添加到流程</button><button class="ghost" id="export-workflow">导出发布 JSON</button></aside>
        <section class="panel canvas"><div class="section-header"><div><h2>流程画布</h2><p>按顺序编排节点，配置每一步的入参、工具和函数。</p></div><div class="field-row"><input id="workflow-name" value="${escapeHtml(state.workflowName)}" aria-label="工作流名称" /><input id="workflow-version" value="${escapeHtml(state.version)}" aria-label="版本号" /></div></div><div class="flow-list">${renderNodes()}</div></section>
      </section>
      <section class="registry-grid">
        <div class="panel"><div class="section-header compact"><h2>工具调用注册表</h2><span>⚙</span></div>${renderRegistry(toolRegistry, (tool) => `<div class="registry-item"><strong>${tool.name}</strong><code>${tool.key}</code><p>${tool.description}</p><span>鉴权：${tool.auth} · ${tool.status}</span></div>`)}</div>
        <div class="panel"><div class="section-header compact"><h2>函数库配置</h2><span>ƒ</span></div>${renderRegistry(functionLibrary, (fn) => `<div class="registry-item"><strong>${fn.name}</strong><code>${fn.signature}</code><p>${fn.description}</p><span>内部函数：${fn.key}</span></div>`)}</div>
        <div class="panel payload-panel"><div class="section-header compact"><h2>发布配置预览</h2><span>🚀</span></div><label>发布方式<select id="publish-mode"><option ${state.publishMode === 'API 服务' ? 'selected' : ''}>API 服务</option><option ${state.publishMode === '定时任务' ? 'selected' : ''}>定时任务</option><option ${state.publishMode === 'Webhook 触发' ? 'selected' : ''}>Webhook 触发</option></select></label><pre>${escapeHtml(payload)}</pre></div>
      </section>
      <section class="panel log-panel"><div class="section-header compact"><h2>运行与发布日志</h2><button class="ghost" id="clear-log">清空日志</button></div><ol>${state.runLog.map((log) => `<li>${escapeHtml(log)}</li>`).join('')}</ol></section>
    </main>`;
}

root.addEventListener('click', (event) => {
  const selectType = event.target.closest('[data-select]')?.dataset.select;
  const deleteId = event.target.closest('[data-delete]')?.dataset.delete;
  if (selectType) { state.selectedType = selectType; render(); }
  if (deleteId) { state.nodes = state.nodes.filter((node) => node.id !== Number(deleteId)); persistState(); render(); }
  if (event.target.id === 'add-node') {
    const operator = getOperator(state.selectedType);
    state.nodes = [...state.nodes, { id: Date.now(), type: state.selectedType, title: operator.label, config: `${operator.description}；内部逻辑：${operator.logic}`, enabled: true }];
    persistState();
    render();
  }
  if (event.target.id === 'save-draft') saveDraft();
  if (event.target.id === 'publish-workflow') publishWorkflow();
  if (event.target.id === 'run-workflow') runWorkflow();
  if (event.target.id === 'export-workflow') exportWorkflow();
  if (event.target.id === 'clear-log') { state.runLog = []; persistState(); render(); }
});

root.addEventListener('input', (event) => {
  const { id, dataset, value } = event.target;
  if (id === 'workflow-name') state.workflowName = value;
  if (id === 'workflow-version') state.version = value;
  if (dataset.id && dataset.field && dataset.field !== 'enabled') state.nodes = state.nodes.map((node) => node.id === Number(dataset.id) ? { ...node, [dataset.field]: value } : node);
  const preview = document.querySelector('pre');
  if (preview) preview.textContent = JSON.stringify(getPayload(), null, 2);
});

root.addEventListener('change', (event) => {
  const { id, dataset, checked } = event.target;
  if (id === 'publish-mode') state.publishMode = event.target.value;
  if (dataset.id && dataset.field === 'enabled') state.nodes = state.nodes.map((node) => node.id === Number(dataset.id) ? { ...node, enabled: checked } : node);
  persistState();
  render();
});

render();
