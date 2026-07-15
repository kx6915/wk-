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
  { name: 'HTTP 请求', key: 'http.request', auth: 'API Key', description: '访问 REST API，支持 GET/POST/PUT/DELETE' },
  { name: '数据库查询', key: 'db.query', auth: '连接串', description: '执行只读 SQL 查询并返回结构化结果' },
  { name: '大模型调用', key: 'llm.chat', auth: '模型密钥', description: '调用对话模型完成生成、分类和抽取' },
  { name: '消息通知', key: 'notify.send', auth: 'Webhook', description: '向企业微信、飞书或 Slack 发送通知' },
];

let nodes = [
  { id: 1, type: 'start', title: '接收需求', config: '输入：业务目标、用户画像、约束条件' },
  { id: 2, type: 'tool', title: '检索知识库', config: '工具：http.request / knowledge.search' },
  { id: 3, type: 'function', title: '整理候选方案', config: '函数：json.pick + score.rank' },
  { id: 4, type: 'publish', title: '发布为接口', config: '输出：/api/workflows/{id}/run' },
];
let selectedType = 'tool';
let workflowName = '智能业务流程编排';
let publishMode = 'API 服务';

const root = document.getElementById('root');
const getOperator = (type) => operatorCatalog.find((item) => item.type === type) ?? operatorCatalog[0];
const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));

function getPayload() {
  return {
    name: workflowName,
    mode: publishMode,
    version: 'v1.0.0',
    nodes: nodes.map((node, index) => ({
      order: index + 1,
      operator: getOperator(node.type).label,
      logic: getOperator(node.type).logic,
      title: node.title,
      config: node.config,
    })),
  };
}

function renderOperators() {
  return operatorCatalog.map((operator) => `
    <button class="operator ${selectedType === operator.type ? 'active' : ''}" data-select="${operator.type}">
      <span>${operator.icon}</span><span>${operator.label}</span><small>${operator.logic}</small>
    </button>`).join('');
}

function renderNodes() {
  return nodes.map((node, index) => {
    const operator = getOperator(node.type);
    return `
      <article class="flow-node">
        <div class="node-index">${index + 1}</div>
        <div class="node-icon">${operator.icon}</div>
        <div class="node-body">
          <div class="node-meta"><span>${operator.label}</span><code>${operator.logic}</code></div>
          <input value="${escapeHtml(node.title)}" data-field="title" data-id="${node.id}" aria-label="${operator.label}标题" />
          <textarea data-field="config" data-id="${node.id}" aria-label="${operator.label}配置">${escapeHtml(node.config)}</textarea>
        </div>
        <button class="icon-button" data-delete="${node.id}" aria-label="删除节点">×</button>
      </article>`;
  }).join('');
}

function renderRegistry(items, mapper) {
  return items.map(mapper).join('');
}

function render() {
  root.innerHTML = `
    <main class="app-shell">
      <section class="hero">
        <div><span class="eyebrow">Workflow Builder</span><h1>工作流搭建、工具调用与发布平台</h1><p>用简单中文操作符搭建流程，平台内部封装逻辑函数、工具适配器和发布配置，帮助业务人员与开发人员共同交付自动化应用。</p><div class="hero-actions"><button class="primary">💾 保存草稿</button><button class="secondary">🚀 发布工作流</button></div></div>
        <div class="publish-card"><div class="card-title">✅ 发布清单</div><ul><li>节点校验：${nodes.length} 个操作符已配置</li><li>工具权限：支持密钥、连接串、Webhook</li><li>发布形态：API、定时任务、Webhook</li></ul></div>
      </section>
      <section class="workspace">
        <aside class="panel palette"><h2>中文操作符</h2><p>前台显示为业务可理解的中文名称，后台映射到稳定逻辑函数。</p><div class="operator-list">${renderOperators()}</div><button class="add-node" id="add-node">＋ 添加到流程</button></aside>
        <section class="panel canvas"><div class="section-header"><div><h2>流程画布</h2><p>按顺序编排节点，配置每一步的入参、工具和函数。</p></div><input id="workflow-name" value="${escapeHtml(workflowName)}" aria-label="工作流名称" /></div><div class="flow-list">${renderNodes()}</div></section>
      </section>
      <section class="registry-grid">
        <div class="panel"><div class="section-header compact"><h2>工具调用注册表</h2><span>⚙</span></div>${renderRegistry(toolRegistry, (tool) => `<div class="registry-item"><strong>${tool.name}</strong><code>${tool.key}</code><p>${tool.description}</p><span>鉴权：${tool.auth}</span></div>`)}</div>
        <div class="panel"><div class="section-header compact"><h2>函数库配置</h2><span>ƒ</span></div>${renderRegistry(functionLibrary, (fn) => `<div class="registry-item"><strong>${fn.name}</strong><code>${fn.signature}</code><p>${fn.description}</p><span>内部函数：${fn.key}</span></div>`)}</div>
        <div class="panel payload-panel"><div class="section-header compact"><h2>发布配置预览</h2><span>🚀</span></div><label>发布方式<select id="publish-mode"><option ${publishMode === 'API 服务' ? 'selected' : ''}>API 服务</option><option ${publishMode === '定时任务' ? 'selected' : ''}>定时任务</option><option ${publishMode === 'Webhook 触发' ? 'selected' : ''}>Webhook 触发</option></select></label><pre>${escapeHtml(JSON.stringify(getPayload(), null, 2))}</pre></div>
      </section>
    </main>`;
}

root.addEventListener('click', (event) => {
  const selectType = event.target.closest('[data-select]')?.dataset.select;
  const deleteId = event.target.closest('[data-delete]')?.dataset.delete;
  if (selectType) { selectedType = selectType; render(); }
  if (deleteId) { nodes = nodes.filter((node) => node.id !== Number(deleteId)); render(); }
  if (event.target.id === 'add-node') {
    const operator = getOperator(selectedType);
    nodes = [...nodes, { id: Date.now(), type: selectedType, title: operator.label, config: `${operator.description}；内部逻辑：${operator.logic}` }];
    render();
  }
});

root.addEventListener('input', (event) => {
  const { id, dataset, value } = event.target;
  if (id === 'workflow-name') workflowName = value;
  if (dataset.id && dataset.field) nodes = nodes.map((node) => node.id === Number(dataset.id) ? { ...node, [dataset.field]: value } : node);
  document.querySelector('pre').textContent = JSON.stringify(getPayload(), null, 2);
});

root.addEventListener('change', (event) => {
  if (event.target.id === 'publish-mode') { publishMode = event.target.value; render(); }
});

render();
