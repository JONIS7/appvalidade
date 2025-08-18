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

// Variável global para guardar o último código lido que não foi encontrado na base
let ultimoCodigoNaoEncontrado = null;

// --- Funções Principais ---

/**
 * Consulta o banco de dados de produtos (fixo e local)
 * @param {string} codigo - O código de barras lido
 * @returns {Promise<object|null>} O objeto do produto se encontrado, ou null.
 */
async function consultarBancoDeProdutos(codigo) {
  try {
    // 1. Carrega o banco de dados local (produtos aprendidos)
    const produtosLocais = JSON.parse(localStorage.getItem('produtosAprendidos')) || [];
    const produtoLocal = produtosLocais.find(p => p.codigo === codigo);
    if (produtoLocal) return produtoLocal;

    // 2. Se não achou, carrega o banco de dados base (produtos.json)
    const response = await fetch('produtos.json');
    if (!response.ok) {
      console.error('Não foi possível carregar o banco de dados base de produtos.');
      return null;
    }
    const produtosBase = await response.json();
    const produtoBase = produtosBase.find(p => p.codigo === codigo);
    return produtoBase || null;

  } catch (error) {
    console.error("Erro ao buscar produto:", error);
    return null;
  }
}


function salvarMedicamento() {
  const nomeInput = document.getElementById("nome");
  const validadeInput = document.getElementById("validade");

  if (!nomeInput.value || !validadeInput.value) {
    alert("Preencha o nome e a data de validade.");
    return;
  }

  // Se estávamos salvando um produto novo que não existia na base
  if (ultimoCodigoNaoEncontrado) {
    // Adiciona o novo produto ao banco de dados que "aprende"
    const produtosLocais = JSON.parse(localStorage.getItem('produtosAprendidos')) || [];
    const novoProdutoAprendido = {
      codigo: ultimoCodigoNaoEncontrado,
      nome: nomeInput.value
    };
    produtosLocais.push(novoProdutoAprendido);
    localStorage.setItem('produtosAprendidos', JSON.stringify(produtosLocais));
    
    console.log('Novo produto aprendido e salvo:', novoProdutoAprendido);
  }

  // Adiciona o T00:00:00 para evitar problemas com fuso horário
  const validade = new Date(validadeInput.value + "T00:00:00");
  
  const novoMed = { 
    id: Date.now(),
    nome: nomeInput.value, 
    validade: validade.toISOString(),
    notificacao6mesesEnviada: false,
    notificacaoVencidoEnviada: false,
  };

  let lista = JSON.parse(localStorage.getItem("medicamentos") || "[]");
  lista.push(novoMed);
  localStorage.setItem("medicamentos", JSON.stringify(lista));

  renderizarLista();
  
  // Limpa os campos e reseta a interface
  nomeInput.value = "";
  validadeInput.value = "";
  nomeInput.placeholder = "Nome ou código do produto";
  document.getElementById('codigo-lido-container').style.display = 'none';
  ultimoCodigoNaoEncontrado = null;
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
      async (decodedText) => {
        pararScanner();

        // Mostra o código lido na tela
        const containerCodigoLido = document.getElementById('codigo-lido-container');
        const textoCodigoLido = document.getElementById('codigo-lido-texto');
        textoCodigoLido.textContent = decodedText;
        containerCodigoLido.style.display = 'block';

        const nomeInput = document.getElementById('nome');
        const validadeInput = document.getElementById('validade');

        const produto = await consultarBancoDeProdutos(decodedText);
        
        if (produto) {
          nomeInput.value = produto.nome;
          validadeInput.focus();
          ultimoCodigoNaoEncontrado = null; // Limpa a variável
        } else {
          nomeInput.value = ""; // Limpa o campo nome
          nomeInput.placeholder = "PRODUTO NOVO! Digite o nome aqui.";
          nomeInput.focus();
          // Guarda o código não encontrado para salvar depois
          ultimoCodigoNaoEncontrado = decodedText;
        }
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
});