(function() {
  var currentScript = document.currentScript || (function() {
    var scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();

  var agentId = currentScript.getAttribute('data-agent-id');
  var publicKey = currentScript.getAttribute('data-public-key');
  var host = currentScript.getAttribute('data-host') || window.location.origin;

  if (!agentId || !publicKey) {
    console.error('[ShopMate AaaS] Missing data-agent-id or data-public-key attributes.');
    return;
  }

  var btn = document.createElement('div');
  btn.id = 'aaas-chat-launcher';
  btn.style.cssText = 'position:fixed;bottom:24px;right:24px;width:60px;height:60px;border-radius:30px;background:#4f46e5;color:#fff;box-shadow:0 10px 25px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:999999;transition:transform 0.2s ease;';
  btn.innerHTML = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';

  var iframeContainer = document.createElement('div');
  iframeContainer.id = 'aaas-chat-container';
  iframeContainer.style.cssText = 'position:fixed;bottom:96px;right:24px;width:400px;height:620px;max-width:calc(100vw - 32px);max-height:calc(100vh - 120px);box-shadow:0 20px 40px rgba(0,0,0,0.4);border-radius:16px;overflow:hidden;z-index:999999;display:none;border:1px solid rgba(255,255,255,0.1);background:#0f172a;';

  var iframe = document.createElement('iframe');
  iframe.src = host + '/embed/' + publicKey + '?agent_id=' + agentId;
  iframe.style.cssText = 'width:100%;height:100%;border:none;';
  iframeContainer.appendChild(iframe);

  var isOpen = false;
  btn.addEventListener('click', function() {
    isOpen = !isOpen;
    iframeContainer.style.display = isOpen ? 'block' : 'none';
    btn.style.transform = isOpen ? 'scale(0.95)' : 'scale(1)';
  });

  document.body.appendChild(iframeContainer);
  document.body.appendChild(btn);
})();
