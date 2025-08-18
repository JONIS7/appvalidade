// Registra o Service Worker ao carregar a página
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => console.log('Service Worker registrado com sucesso:', registration))
      .catch(err => console.log('Falha ao registrar Service Worker:', err));
  });
}

// Pede permissão para notificações
function pedirPermissaoNotificacao() {
  if ('Notification' in window && Notification.permission !== 'granted') {
    Notification.requestPermission();
  }
}

// --- Funções Principais ---

function salvarMedicamento() {
  const nomeInput = document.getElementById("nome");
  const validadeInput = document.getElementById("validade");

  if (!nomeInput.value || !validadeInput.value) {
    alert("Preencha o nome e a data de validade.");
    return;
  }

  // Adiciona o T00:00:00 para evitar problemas com fuso horário
  const validade = new Date(validadeInput.value + "T00:00:00");
  
  const novoMed = { 
    id: Date.now(), // ID único para cada medicamento
    nome: nomeInput.value, 
    validade: validade.toISOString(),
    notificacao6mesesEnviada: false,
    notificacaoVencidoEnviada: false,
  };

  let lista = JSON.parse(localStorage.getItem("medicamentos") || "[]");
  lista.push(novoMed);
  localStorage.setItem("medicamentos", JSON.stringify(lista));

  renderizarLista();
  nomeInput.value = "";
  validadeInput.value = "";
}

function renderizarLista() {
  const listaHTML = document.getElementById("lista");
  listaHTML.innerHTML = "";
  const lista = JSON.parse(localStorage.getItem("medicamentos") || "[]");
  
  // Ordena a lista por data de validade, do mais próximo ao mais distante
  lista.sort((a, b) => new Date(a.validade) - new Date(b.validade));

  if (lista.length === 0) {
    listaHTML.innerHTML = '<p style="text-align:center;">Nenhum medicamento cadastrado.</p>';
    return;
  }

  lista.forEach(med => {
    const dataVal = new Date(med.validade);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0); // Zera a hora para comparar apenas a data

    const seisMesesAtras = new Date(dataVal);
    seisMesesAtras.setMonth(dataVal.getMonth() - 6);

    let classe = "verde";
    if (dataVal < hoje) {
      classe = "vermelho";
    } else if (hoje >= seisMesesAtras) {
      classe = "amarelo";
    }

    const li = document.createElement("li");
    li.className = `item ${classe}`;
    li.innerHTML = `
      <div>
        <div class="info">${med.nome}</div>
        <div class="data">Validade: ${dataVal.toLocaleDateString('pt-BR')}</div>
      </div>
    `;
    listaHTML.appendChild(li);
  });
}

function verificarENotificar() {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return; // Não faz nada se não tiver permissão
  }

  let lista = JSON.parse(localStorage.getItem("medicamentos") || "[]");
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  let listaModificada = false;

  lista.forEach(med => {
    const dataVal = new Date(med.validade);
    const seisMesesAtras = new Date(dataVal);
    seisMesesAtras.setMonth(dataVal.getMonth() - 6);
    
    // Verifica alerta de 6 meses
    if (hoje >= seisMesesAtras && dataVal >= hoje && !med.notificacao6mesesEnviada) {
      new Notification("Alerta de Validade", {
        body: `Faltam 6 meses ou menos para o vencimento de ${med.nome}!`,
        icon: 'icons/icon-192x192.png'
      });
      med.notificacao6mesesEnviada = true;
      listaModificada = true;
    }

    // Verifica produto vencido
    if (dataVal < hoje && !med.notificacaoVencidoEnviada) {
      new Notification("Produto Vencido!", {
        body: `O medicamento ${med.nome} venceu.`,
        icon: 'icons/icon-192x192.png'
      });
      med.notificacaoVencidoEnviada = true;
      listaModificada = true;
    }
  });

  if (listaModificada) {
    localStorage.setItem("medicamentos", JSON.stringify(lista));
  }
}

// --- Scanner ---
let html5QrCode = null;

function iniciarScanner() {
  const readerDiv = document.getElementById("reader");
  const scanBtn = document.getElementById("scanBtn");
  
  if (readerDiv.style.display === "none") {
    readerDiv.style.display = "block";
    scanBtn.textContent = "Parar Scanner";

    html5QrCode = new Html5Qrcode("reader");
    html5QrCode.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (decodedText) => {
        document.getElementById("nome").value = decodedText;
        pararScanner(); // Para o scanner após sucesso
        document.getElementById("validade").focus(); // Move o foco para a data
      },
      (errorMessage) => { /* ignora erros contínuos */ }
    ).catch((err) => {
      console.log("Erro ao iniciar câmera", err);
      alert("Não foi possível iniciar a câmera. Verifique as permissões.");
      pararScanner();
    });
  } else {
    pararScanner();
  }
}

function pararScanner() {
  const readerDiv = document.getElementById("reader");
  const scanBtn = document.getElementById("scanBtn");

  if (html5QrCode && html5QrCode.isScanning) {
    html5QrCode.stop().then(() => {
      readerDiv.style.display = "none";
      scanBtn.textContent = "📷 Ler Código de Barras";
    }).catch(err => console.log("Erro ao parar scanner", err));
  } else {
      readerDiv.style.display = "none";
      scanBtn.textContent = "📷 Ler Código de Barras";
  }
}


// --- Inicialização e Eventos ---
document.getElementById("salvarBtn").addEventListener("click", salvarMedicamento);
document.getElementById("scanBtn").addEventListener("click", iniciarScanner);

// Funções executadas ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
  pedirPermissaoNotificacao();
  renderizarLista();
  verificarENotificar();
});;
