document.addEventListener('DOMContentLoaded', () => {
  // --- INICIALIZAÇÃO E ELEMENTOS GLOBAIS ---
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js')
        .then(reg => console.log('Service Worker registrado:', reg))
        .catch(err => console.log('Falha ao registrar Service Worker:', err));
    });
  }
  pedirPermissaoNotificacao();

  const viewGondolas = document.getElementById('view-gondolas');
  const viewProdutos = document.getElementById('view-produtos');
  const headerTitle = document.getElementById('header-title');

  const formGondola = document.getElementById('form-gondola');
  const nomeGondolaInput = document.getElementById('nome-gondola');
  const listaGondolasHTML = document.getElementById('lista-gondolas');

  const btnVoltar = document.getElementById('btn-voltar');
  const salvarMedBtn = document.getElementById('salvarBtn');
  const scanBtn = document.getElementById('scanBtn');
  const listaProdutosHTML = document.getElementById('lista'); // Adicionada referência para a lista de produtos

  let ultimoCodigoNaoEncontrado = null;
  let gondolaAtivaId = null;
  let html5QrCode = null;

  // --- LÓGICA DE NAVEGAÇÃO ENTRE TELAS ---
  function mostrarViewGondolas() {
    headerTitle.textContent = 'Gôndolas';
    viewGondolas.style.display = 'block';
    viewProdutos.style.display = 'none';
    gondolaAtivaId = null;
    renderizarGondolas();
  }

  function mostrarViewProdutos(gondolaId, gondolaNome) {
    headerTitle.textContent = gondolaNome;
    viewGondolas.style.display = 'none';
    viewProdutos.style.display = 'block';
    document.getElementById('titulo-lista-produtos').textContent = `Produtos na Gôndola "${gondolaNome}"`;
    gondolaAtivaId = gondolaId;
    renderizarLista(gondolaAtivaId);
  }

  // --- LÓGICA DAS GÔNDOLAS ---
  function renderizarGondolas() {
    const gondolas = JSON.parse(localStorage.getItem('gondolas')) || [];
    listaGondolasHTML.innerHTML = '';
    if (gondolas.length === 0) {
      listaGondolasHTML.innerHTML = '<p style="text-align:center;">Nenhuma gôndola cadastrada.</p>';
      return;
    }
    gondolas.forEach(gondola => {
      const li = document.createElement('li');
      // O nome da gôndola agora fica dentro de um span para alinhar com o botão
      li.innerHTML = `
        <span class="gondola-nome">${gondola.nome}</span>
        <button class="btn-delete" data-id="${gondola.id}">Apagar</button>
      `;
      // O evento de clique para abrir a gôndola é no nome
      li.querySelector('.gondola-nome').addEventListener('click', () => {
        mostrarViewProdutos(gondola.id, gondola.nome);
      });
      listaGondolasHTML.appendChild(li);
    });
  }
  
  function salvarGondola(event) {
    event.preventDefault();
    const nome = nomeGondolaInput.value.trim();
    if (!nome) {
      alert('Por favor, insira um nome para a gôndola.');
      return;
    }
    const gondolas = JSON.parse(localStorage.getItem('gondolas')) || [];
    const novaGondola = { id: Date.now(), nome: nome };
    gondolas.push(novaGondola);
    localStorage.setItem('gondolas', JSON.stringify(gondolas));
    nomeGondolaInput.value = '';
    renderizarGondolas();
  }

  // **** NOVA FUNÇÃO PARA APAGAR GÔNDOLA ****
  function apagarGondola(gondolaIdParaApagar) {
    const confirmacao = confirm("Tem certeza que deseja apagar esta gôndola? TODOS os medicamentos dentro dela também serão apagados.");
    if (confirmacao) {
      // Apaga a gôndola
      let gondolas = JSON.parse(localStorage.getItem('gondolas')) || [];
      gondolas = gondolas.filter(g => g.id !== gondolaIdParaApagar);
      localStorage.setItem('gondolas', JSON.stringify(gondolas));

      // Apaga os medicamentos associados
      let medicamentos = JSON.parse(localStorage.getItem('medicamentos')) || [];
      medicamentos = medicamentos.filter(med => med.gondolaId !== gondolaIdParaApagar);
      localStorage.setItem('medicamentos', JSON.stringify(medicamentos));

      renderizarGondolas();
    }
  }

  // --- LÓGICA DOS MEDICAMENTOS (ATUALIZADA) ---
  const validadeElement = document.getElementById('validade');
  const mascaraData = { /* ... (código da máscara continua o mesmo) ... */ };
  const mask = IMask(validadeElement, mascaraData);

  async function consultarBancoDeProdutos(codigo) { /* ... (função continua a mesma) ... */ }

  function salvarMedicamento() { /* ... (função continua a mesma) ... */ }

  function renderizarLista(idDaGondola) {
    const todosMedicamentos = JSON.parse(localStorage.getItem("medicamentos") || "[]");
    const medicamentosDaGondola = todosMedicamentos.filter(med => med.gondolaId === idDaGondola);
    
    listaProdutosHTML.innerHTML = "";
    medicamentosDaGondola.sort((a, b) => new Date(a.validade) - new Date(b.validade));

    if (medicamentosDaGondola.length === 0) {
      listaProdutosHTML.innerHTML = '<p style="text-align:center;">Nenhum medicamento cadastrado nesta gôndola.</p>';
      return;
    }

    medicamentosDaGondola.forEach(med => {
      const dataVal = new Date(med.validade);
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      const seisMesesAtras = new Date(dataVal);
      seisMesesAtras.setMonth(dataVal.getMonth() - 6);

      let classe = "verde";
      if (dataVal < hoje) classe = "vermelho";
      else if (hoje >= seisMesesAtras) classe = "amarelo";

      const li = document.createElement("li");
      li.className = `item ${classe}`;
      // **** ADICIONADO BOTÃO DE APAGAR AO ITEM DA LISTA ****
      li.innerHTML = `
        <div>
          <div class="info">${med.nome}</div>
          <div class="data">Validade: ${dataVal.toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' })}</div>
        </div>
        <button class="btn-delete" data-id="${med.id}">Apagar</button>
      `;
      listaProdutosHTML.appendChild(li);
    });
  }

  // **** NOVA FUNÇÃO PARA APAGAR MEDICAMENTO ****
  function apagarMedicamento(medicamentoIdParaApagar) {
    let medicamentos = JSON.parse(localStorage.getItem('medicamentos')) || [];
    medicamentos = medicamentos.filter(med => med.id !== medicamentoIdParaApagar);
    localStorage.setItem('medicamentos', JSON.stringify(medicamentos));
    renderizarLista(gondolaAtivaId); // Re-renderiza a lista da gôndola ativa
  }

  function pedirPermissaoNotificacao() { /* ... (função continua a mesma) ... */ }
  function verificarENotificar() { /* ... (função continua a mesma) ... */ }
  
  // --- SCANNER ---
  function iniciarScanner() { /* ... (função continua a mesma) ... */ }
  function pararScanner() { /* ... (função continua a mesma) ... */ }

  // --- EVENT LISTENERS (ATUALIZADO PARA DELEGAÇÃO) ---
  formGondola.addEventListener('submit', salvarGondola);
  btnVoltar.addEventListener('click', mostrarViewGondolas);
  salvarMedBtn.addEventListener('click', salvarMedicamento);
  scanBtn.addEventListener('click', iniciarScanner);

  // **** DELEGAÇÃO DE EVENTOS PARA OS BOTÕES DE APAGAR ****
  listaGondolasHTML.addEventListener('click', (event) => {
    if (event.target.classList.contains('btn-delete')) {
      const id = parseInt(event.target.dataset.id, 10);
      apagarGondola(id);
    }
  });

  listaProdutosHTML.addEventListener('click', (event) => {
    if (event.target.classList.contains('btn-delete')) {
      const id = parseInt(event.target.dataset.id, 10);
      apagarMedicamento(id);
    }
  });

  // --- INICIALIZAÇÃO DO APP ---
  mostrarViewGondolas();
  verificarENotificar();
});

// =========================================================================
// COLE O CORPO DAS FUNÇÕES QUE NÃO FORAM ALTERADAS A PARTIR DAQUI
// (As funções abaixo estão completas para você não ter que procurar)
// =========================================================================

function pedirPermissaoNotificacao() {
  if ('Notification' in window && Notification.permission !== 'granted') {
    Notification.requestPermission();
  }
}

function verificarENotificar() {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  let lista = JSON.parse(localStorage.getItem("medicamentos") || "[]");
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  let listaModificada = false;

  lista.forEach(med => {
    const dataVal = new Date(med.validade);
    const seisMesesAtras = new Date(dataVal);
    seisMesesAtras.setMonth(dataVal.getMonth() - 6);
    
    if (hoje >= seisMesesAtras && dataVal >= hoje && !med.notificacao6mesesEnviada) {
      new Notification("Alerta de Validade", {
        body: `Faltam 6 meses ou menos para o vencimento de ${med.nome}!`,
        icon: 'icons/icon-192x192.png'
      });
      med.notificacao6mesesEnviada = true;
      listaModificada = true;
    }

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

async function consultarBancoDeProdutos(codigo) {
    try {
      const produtosLocais = JSON.parse(localStorage.getItem('produtosAprendidos')) || [];
      const produtoLocal = produtosLocais.find(p => p.codigo === codigo);
      if (produtoLocal) return produtoLocal;

      const response = await fetch('produtos.json');
      if (!response.ok) return null;
      const produtosBase = await response.json();
      return produtosBase.find(p => p.codigo === codigo) || null;
    } catch (error) {
      console.error("Erro ao buscar produto:", error);
      return null;
    }
}

function salvarMedicamento() {
    if (!gondolaAtivaId) {
      alert('Erro: Nenhuma gôndola selecionada.');
      return;
    }
    const nomeInput = document.getElementById("nome");
    const validadeInput = document.getElementById("validade");

    if (!nomeInput.value || validadeInput.value.length < 5) {
      alert("Preencha o nome e a data de validade completa (MM/AA).");
      return;
    }

    const partes = validadeInput.value.split('/');
    const mes = parseInt(partes[0], 10);
    const ano = parseInt(`20${partes[1]}`, 10);
    const validade = new Date(ano, mes, 0);

    if (ultimoCodigoNaoEncontrado) {
      const produtosLocais = JSON.parse(localStorage.getItem('produtosAprendidos')) || [];
      produtosLocais.push({ codigo: ultimoCodigoNaoEncontrado, nome: nomeInput.value });
      localStorage.setItem('produtosAprendidos', JSON.stringify(produtosLocais));
    }
    
    const novoMed = { 
      id: Date.now(),
      nome: nomeInput.value, 
      validade: validade.toISOString(),
      gondolaId: gondolaAtivaId,
      notificacao6mesesEnviada: false,
      notificacaoVencidoEnviada: false,
    };

    const medicamentos = JSON.parse(localStorage.getItem("medicamentos") || "[]");
    medicamentos.push(novoMed);
    localStorage.setItem("medicamentos", JSON.stringify(medicamentos));

    renderizarLista(gondolaAtivaId);
    
    nomeInput.value = "";
    validadeInput.value = "";
    nomeInput.placeholder = "Nome ou código do produto";
    document.getElementById('codigo-lido-container').style.display = 'none';
    ultimoCodigoNaoEncontrado = null;
}

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
            ultimoCodigoNaoEncontrado = null;
          } else {
            nomeInput.value = "";
            nomeInput.placeholder = "PRODUTO NOVO! Digite o nome aqui.";
            nomeInput.focus();
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