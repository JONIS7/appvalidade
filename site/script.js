// =================================================================
//  CONFIGURAÇÃO DA API DO GOOGLE
// =================================================================
const CLIENT_ID = '719120850140-srm2npv46ahg8aobbjh6v7k262980i24.apps.googleusercontent.com'; // SUBSTITUA PELO SEU CLIENT ID
const API_KEY = 'AIzaSyB2uVcNE3RtMrPrhIhYYRKlmwqjMaFUCgg'; // SUBSTITUA PELA SUA API KEY GERADA NO GOOGLE CLOUD
const SCOPES = 'https://www.googleapis.com/auth/calendar.events';

let tokenClient;
let gapiInited = false;
let gisInited = false;
let usuarioLogado = null;
let medicamentos = JSON.parse(localStorage.getItem('medicamentos')) || [];

// =================================================================
//  INICIALIZAÇÃO DA APLICAÇÃO
// =================================================================
window.onload = function() {
    // Carrega o GAPI (Google API) para a Agenda
    gapi.load('client', initializeGapiClient);
    
    // Carrega o GIS (Google Identity Services) para Login
    google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: handleCredentialResponse
    });
    google.accounts.id.renderButton(
        document.getElementById("g_id_signin"),
        { theme: "outline", size: "large" }
    );

    // Inicializa o cliente de token para pedir permissão da Agenda
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (tokenResponse) => {
            if (tokenResponse.error) {
                console.error(tokenResponse.error);
                return;
            }
            console.log("Permissão da Agenda concedida!");
            // Após a permissão, exibe a tela principal
            mostrarTela2(usuarioLogado);
        },
    });

    // Recuperar usuário logado ao recarregar a página
    usuarioLogado = localStorage.getItem('usuarioLogado');
    if (usuarioLogado) {
        // Se já está logado, vai direto para a tela 2
        mostrarTela2(usuarioLogado);
    }
};

// =================================================================
//  FUNÇÕES DE AUTENTICAÇÃO E API
// =================================================================
async function initializeGapiClient() {
    await gapi.client.init({
        apiKey: API_KEY,
        discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"],
    });
    gapiInited = true;
}

function handleCredentialResponse(response) {
    const data = parseJwt(response.credential);
    usuarioLogado = data.name;
    localStorage.setItem('usuarioLogado', usuarioLogado);
    
    // IMPORTANTE: Após o login, peça a permissão para a Agenda
    // Se o usuário negar, a tela 2 será exibida mesmo assim.
    tokenClient.requestAccessToken(); 
}

// Função para decodificar JWT (token do Google)
function parseJwt(token) {
    if (!token) return {};
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
}

// =================================================================
//  NOVA FUNÇÃO: CRIAR EVENTO NA GOOGLE AGENDA
// =================================================================
async function criarEventoNaAgenda(event) {
    if (!gapiInited) {
        alert("A API do Google ainda não foi inicializada. Tente novamente em alguns segundos.");
        return;
    }
    try {
        const request = gapi.client.calendar.events.insert({
            'calendarId': 'primary', // 'primary' se refere à agenda principal do usuário
            'resource': event,
        });
        const response = await request;
        console.log('Evento criado: ', response.result);
        alert(`Lembrete "${event.summary}" criado na sua Google Agenda!`);
    } catch (err) {
        console.error('Erro ao criar evento:', err);
        // O erro mais comum é o usuário não ter dado permissão.
        if (err.status === 401 || err.status === 403) {
             alert('Não foi possível criar o lembrete. Por favor, recarregue a página e dê permissão para acesso à sua agenda.');
             // Tenta pedir a permissão novamente
             tokenClient.requestAccessToken();
        } else {
            alert('Ocorreu um erro inesperado ao criar o lembrete.');
        }
    }
}


// =================================================================
//  TELAS DA APLICAÇÃO (COM MODIFICAÇÕES)
// =================================================================

function mostrarTela2(nomeUsuario) {
    medicamentos = JSON.parse(localStorage.getItem('medicamentos')) || [];
    document.body.innerHTML = `
    <div class="container-fluid min-vh-100 d-flex flex-column justify-content-start align-items-center bg-dark py-3">
        <div class="w-100 mx-auto" style="max-width: 100vw;">
            <div class="bg-dark text-white rounded-3 shadow p-3">
                <h5 class="fw-bold mb-2 text-center">Olá, ${nomeUsuario || 'Usuário'}!</h5>
                <div class="fw-bold mb-2" style="font-size:1.1rem;">NOVO MEDICAMENTO</div>
                <div class="row g-3">
                    <div class="col-4">
                        <div class="border rounded-3 d-flex flex-column align-items-center justify-content-center"
                             style="height:110px; cursor:pointer; font-size:3rem; font-weight:700; color:#fff; background:rgba(255,255,255,0.07);">
                            +
                        </div>
                    </div>
                    ${medicamentos.map((med, index) => `
                        <div class="col-4">
                            <div class="gondola-card border rounded-3 position-relative d-flex flex-column align-items-center justify-content-center text-white"
                                 style="height:110px; cursor:pointer; background-size:cover; background-position:center; background-image:url('${med.imagem || ''}');">
                                <div class="overlay position-absolute top-0 start-0 w-100 h-100" style="background:rgba(0,0,0,0.5); border-radius:.5rem;"></div>
                                <div class="content position-relative text-center">
                                    <div class="fw-bold" style="font-size:0.95rem;">${med.nome}</div>
                                    <div class="small text-danger" style="font-size:0.8rem;">${formatarData(med.vencimento)}</div>
                                </div>
                                <button class="btn btn-sm btn-danger position-absolute top-0 end-0 m-1 d-none btn-delete" data-index="${index}" tabindex="-1">🗑️</button>
                            </div>
                        </div>
                    `).join('')}
                </div>

                <div class="mt-4 text-center">
                    <button id="btnLembreteMensal" class="btn btn-outline-primary">Criar Lembrete Mensal de Verificação (UC)</button>
                </div>
            </div>
        </div>
    </div>
    `;

    // --- EVENT LISTENERS DA TELA 2 ---
    document.querySelector('.row .col-4:first-child > div').addEventListener('click', () => mostrarTelaCadastro());
    
    document.querySelectorAll('.gondola-card').forEach((card, i) => {
        card.addEventListener('mouseenter', function() { this.querySelector('.btn-delete').classList.remove('d-none'); });
        card.addEventListener('mouseleave', function() { this.querySelector('.btn-delete').classList.add('d-none'); });
        card.addEventListener('click', function() { mostrarDetalhesMedicamento(medicamentos[i]); });
    });

    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', function(event) {
            event.stopPropagation();
            const index = this.getAttribute('data-index');
            medicamentos.splice(index, 1);
            localStorage.setItem('medicamentos', JSON.stringify(medicamentos));
            mostrarTela2(usuarioLogado);
        });
    });

    // --- LÓGICA DO NOVO BOTÃO DE LEMBRETE MENSAL ---
    document.getElementById('btnLembreteMensal').onclick = () => {
        const proximoMes = new Date();
        proximoMes.setMonth(proximoMes.getMonth() + 1);
        proximoMes.setDate(1);
        const dataInicio = proximoMes.toISOString().split('T')[0];

        const eventoMensal = {
            'summary': 'Verificar Produtos e Atualizar Etiquetas UC',
            'description': 'Lembrete automático para verificar a validade dos produtos e atualizar a etiqueta de "Última Chance" (UC).',
            'start': { 'date': dataInicio },
            'end': { 'date': dataInicio },
            'recurrence': [
                'RRULE:FREQ=MONTHLY;BYMONTHDAY=1,2,3,4,5' 
            ]
        };
        criarEventoNaAgenda(eventoMensal);
    };
}

function mostrarDetalhesMedicamento(med) {
    // ... (nenhuma mudança aqui, seu código original)
    document.body.innerHTML = `
    <div class="container-fluid bg-dark text-white min-vh-100 d-flex flex-column">
        <div class="flex-grow-1 d-flex flex-column">
            <div class="position-relative flex-grow-1">
                <img src="${med.imagem}" 
                     alt="${med.nome}" 
                     class="w-100 h-100" 
                     style="object-fit:cover; filter:brightness(0.6);">
                <div class="position-absolute top-0 start-0 w-100 h-100 d-flex flex-column justify-content-center align-items-center text-center p-4">
                    <h2 class="fw-bold mb-3">${med.nome}</h2>
                    <p class="fs-5"><strong>Validade:</strong> ${formatarData(med.vencimento)}</p>
                    <button class="btn btn-secondary mt-3" id="voltarTela2">Voltar</button>
                </div>
            </div>
        </div>
    </div>
    `;
    document.getElementById('voltarTela2').onclick = () => mostrarTela2(usuarioLogado);
}

function mostrarTelaCadastro() {
    // ... (código do formulário original, com modificações no onsubmit)
    document.body.innerHTML = `
    <div class="container-fluid min-vh-100 d-flex flex-column justify-content-start align-items-center bg-dark py-3">
        <div class="w-100 mx-auto" style="max-width: 430px;">
            <div class="bg-dark text-white rounded-3 shadow p-4">
                <h5 class="fw-bold mb-3 text-center">Cadastro de Medicamento</h5>
                <form id="formCadastro">
                    <div class="mb-3 text-start">
                        <label class="form-label fw-bold">Nome do Medicamento</label>
                        <input type="text" class="form-control" placeholder="Digite o nome" required>
                    </div>
                    <div class="mb-3 text-start">
                        <label class="form-label fw-bold">Data de Vencimento</label>
                        <input type="date" class="form-control" required>
                    </div>
                    <div class="mb-3 text-start">
                        <label class="form-label fw-bold">Foto do Produto</label>
                        <div class="d-flex gap-2">
                            <input type="file" class="form-control mb-2" id="inputArquivo" accept="image/*">
                            <button type="button" class="btn btn-outline-secondary" id="abrirCamera" title="Abrir câmera">
                                <span class="bi bi-camera"></span> 📷
                            </button>
                        </div>
                        <input type="file" accept="image/*" capture="environment" id="inputCamera" style="display:none;">
                        <div class="border rounded d-flex align-items-center justify-content-center mt-2" style="height:100px; background:rgba(255,255,255,0.07);" id="previewImg">
                            <span class="text-secondary">Preview da imagem</span>
                        </div>
                    </div>
                    <button type="submit" class="btn btn-success w-100 mt-3">Salvar</button>
                    <button type="button" class="btn btn-link w-100 mt-2 text-white" id="voltarTela2">Voltar</button>
                </form>
            </div>
        </div>
    </div>
    `;

    document.getElementById('voltarTela2').onclick = () => mostrarTela2(usuarioLogado);
    document.getElementById('abrirCamera').onclick = () => document.getElementById('inputCamera').click();
    
    function previewImagem(input) {
        const preview = document.getElementById('previewImg');
        if (input.files && input.files[0]) {
            const reader = new FileReader();
            reader.onload = function(e) { preview.innerHTML = `<img src="${e.target.result}" alt="Preview" style="max-height:90px; max-width:100%;">`; };
            reader.readAsDataURL(input.files[0]);
        }
    }
    document.getElementById('inputArquivo').onchange = function() { previewImagem(this); };
    document.getElementById('inputCamera').onchange = function() { previewImagem(this); };

    // --- LÓGICA DE SUBMISSÃO DO FORMULÁRIO MODIFICADA ---
    document.getElementById('formCadastro').onsubmit = function(event) {
        event.preventDefault();

        const nome = document.querySelector('input[placeholder="Digite o nome"]').value;
        const vencimentoStr = document.querySelector('input[type="date"]').value;
        const fileInput = document.getElementById('inputArquivo');
        const cameraInput = document.getElementById('inputCamera');

        // --- LÓGICA DA AGENDA ---
        const dataVencimento = new Date(vencimentoStr + 'T00:00:00');
        const dataAlerta = new Date(dataVencimento);
        dataAlerta.setMonth(dataAlerta.getMonth() - 1); // Calcula 1 mês antes do vencimento
        const dataAlertaStr = dataAlerta.toISOString().split('T')[0]; // Formato: YYYY-MM-DD

        const eventoVencimento = {
            'summary': `RETIRAR PRODUTO: ${nome}`,
            'description': `O produto "${nome}" vence em 1 mês (em ${vencimentoStr}). Por favor, verifique e retire-o se necessário.`,
            'start': { 'date': dataAlertaStr }, // Evento para o dia inteiro
            'end': { 'date': dataAlertaStr },
            'recurrence': [ 'RRULE:FREQ=DAILY;COUNT=2' ], // Notifica por 2 dias seguidos
        };
        criarEventoNaAgenda(eventoVencimento);
        // --- FIM DA LÓGICA DA AGENDA ---
        
        function salvar(imagemBase64) {
            medicamentos.push({ nome, vencimento: vencimentoStr, imagem: imagemBase64 });
            localStorage.setItem('medicamentos', JSON.stringify(medicamentos));
            mostrarTela2(usuarioLogado);
        }

        if (cameraInput.files && cameraInput.files[0]) {
            const reader = new FileReader();
            reader.onload = function(e) { salvar(e.target.result); };
            reader.readAsDataURL(cameraInput.files[0]);
        } else if (fileInput.files && fileInput.files[0]) {
            const reader = new FileReader();
            reader.onload = function(e) { salvar(e.target.result); };
            reader.readAsDataURL(fileInput.files[0]);
        } else {
            salvar('');
        }
    };
}

/**
 * Formata uma data do formato AAAA-MM-DD para DD/MM/AAAA.
 * @param {string} dataString A data no formato "AAAA-MM-DD".
 * @returns {string} A data formatada como "DD/MM/AAAA".
 */
function formatarData(dataString) {
    if (!dataString) {
        return "Data inválida";
    }
    const partes = dataString.split('-'); // Divide "2025-10-28" em ["2025", "10", "28"]
    if (partes.length !== 3) {
        return dataString; // Retorna o original se não estiver no formato esperado
    }
    const [ano, mes, dia] = partes;
    return `${dia}/${mes}/${ano}`; // Remonta como "28/10/2025"
}