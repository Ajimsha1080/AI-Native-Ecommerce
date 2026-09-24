(function() {
  var currentScript = document.currentScript || (function() {
    var scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();

  if (!currentScript) return;

  var deploymentId = currentScript.getAttribute('data-deployment') || currentScript.getAttribute('data-deployment-id');
  var agentId = currentScript.getAttribute('data-agent-id') || 'agent_shopmate_01';
  var publicKey = currentScript.getAttribute('data-public-key') || deploymentId || 'pk_live_widget_8829f01';
  
  // Resolve host from script src or current origin
  var scriptSrc = currentScript.getAttribute('src') || '';
  var host = currentScript.getAttribute('data-host');
  if (!host) {
    if (scriptSrc.indexOf('http') === 0) {
      var urlParts = scriptSrc.split('/');
      host = urlParts[0] + '//' + urlParts[2];
    } else {
      host = window.location.origin;
    }
  }

  var targetKey = deploymentId || publicKey;

  var btn = document.createElement('div');
  btn.id = 'aaas-chat-launcher';
  btn.style.cssText = 'position:fixed;bottom:24px;right:24px;width:56px;height:56px;border-radius:28px;background:#8b5cf6;color:#ffffff;box-shadow:0 10px 30px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:999999;transition:transform 0.2s ease,box-shadow 0.2s ease;';
  btn.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';

  var iframeContainer = document.createElement('div');
  iframeContainer.id = 'aaas-chat-container';
  iframeContainer.style.cssText = 'position:fixed;bottom:92px;right:24px;width:400px;height:620px;max-width:calc(100vw - 32px);max-height:calc(100vh - 120px);box-shadow:0 20px 45px rgba(0,0,0,0.5);border-radius:20px;overflow:hidden;z-index:999999;display:none;border:1px solid rgba(255,255,255,0.12);background:#0b0c0e;';

  var iframe = document.createElement('iframe');
  iframe.src = host + '/embed/' + targetKey + '?agent_id=' + encodeURIComponent(agentId);
  iframe.style.cssText = 'width:100%;height:100%;border:none;';
  iframeContainer.appendChild(iframe);

  var isOpen = false;
  btn.addEventListener('click', function() {
    isOpen = !isOpen;
    iframeContainer.style.display = isOpen ? 'block' : 'none';
    btn.style.transform = isOpen ? 'scale(0.92)' : 'scale(1)';
  });

  if (document.body) {
    document.body.appendChild(iframeContainer);
    document.body.appendChild(btn);
  } else {
    document.addEventListener('DOMContentLoaded', function() {
      document.body.appendChild(iframeContainer);
      document.body.appendChild(btn);
    });
  }
})();
