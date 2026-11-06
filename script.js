
// ==========================================
// CONFIGURAÇÃO DO SUPABASE
// ==========================================

const SUPABASE_URL = "https://fjuzjfxdjmyinbqnkuhl.supabase.co";

const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_79_WUIdnLm0rat6XB65kZA_0H-IPyei";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
        }
    }
);

let movimentacoes = [];
let financeiroAtual = "";
let usuarioAtual = null;
let usuarioCarregado = null;

const filtroMes = document.getElementById("filtroMes");

const hoje = new Date();

filtroMes.value =
    hoje.getFullYear() + "-" +
    String(hoje.getMonth() + 1).padStart(2, "0");

document.getElementById("data").value =
    hoje.getFullYear() + "-" +
    String(hoje.getMonth() + 1).padStart(2, "0") + "-" +
    String(hoje.getDate()).padStart(2, "0");


// ==========================================
// LOGIN E AUTENTICAÇÃO
// ==========================================

async function entrar(event) {
    event.preventDefault();

    const email = document.getElementById("emailLogin").value.trim();
    const senha = document.getElementById("senhaLogin").value;
    const mensagem = document.getElementById("mensagemLogin");
    const botao = document.getElementById("botaoLogin");

    mensagem.textContent = "";
    botao.disabled = true;
    botao.textContent = "Entrando...";

    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: senha
        });

        if (error) {
            console.error("Erro no login:", error);
            mensagem.textContent = error.message;
            botao.disabled = false;
            botao.textContent = "Entrar";
            return;
        }

        if (data.session) {
            await iniciarSistema(data.session);
        }

    } catch (erro) {
        console.error("Erro inesperado no login:", erro);
        mensagem.textContent = "Erro de conexão. Tente novamente.";
        botao.disabled = false;
        botao.textContent = "Entrar";
    }
}


async function sair() {
    const confirmar = confirm("Deseja realmente sair da sua conta?");

    if (!confirmar) return;

    const { error } = await supabaseClient.auth.signOut();

    if (error) {
        console.error("Erro ao sair:", error);
        alert("Não foi possível sair. Tente novamente.");
    }
}


function mostrarLogin() {
    document.getElementById("telaLogin").style.display = "block";
    document.getElementById("appContainer").style.display = "none";

    document.getElementById("botaoLogin").disabled = false;
    document.getElementById("botaoLogin").textContent = "Entrar";

    usuarioAtual = null;
    usuarioCarregado = null;
    movimentacoes = [];
    financeiroAtual = "";
}


async function iniciarSistema(session) {
    if (!session || !session.user) {
        mostrarLogin();
        return;
    }

    usuarioAtual = session.user;

    if (usuarioCarregado === usuarioAtual.id) {
        document.getElementById("telaLogin").style.display = "none";
        document.getElementById("appContainer").style.display = "block";
        return;
    }

    const mensagem = document.getElementById("mensagemLogin");

    try {
        mensagem.textContent = "Carregando suas finanças...";

        const { data, error } = await supabaseClient
            .from("movimentacoes")
            .select("*")
            .order("data", { ascending: false });

        if (error) {
            console.error("Erro ao carregar movimentações:", error);
            mensagem.textContent = "Erro ao carregar os dados: " + error.message;
            return;
        }

        movimentacoes = data.map(item => ({
            ...item,
            valor: Number(item.valor)
        }));

        usuarioCarregado = usuarioAtual.id;

        document.getElementById("telaLogin").style.display = "none";
        document.getElementById("appContainer").style.display = "block";

        document.getElementById("usuarioLogado").textContent =
            usuarioAtual.email;

        atualizarCategorias();
        atualizarDashboard();

        if (financeiroAtual) {
            atualizarFinanceiro();
        }

    } catch (erro) {
        console.error("Erro ao iniciar sistema:", erro);
        mensagem.textContent = "Não foi possível carregar suas finanças.";
    }
}


// Detectar automaticamente quando o usuário entra ou sai

supabaseClient.auth.onAuthStateChange((event, session) => {
    if (session) {
        if (event !== "SIGNED_IN") {
            queueMicrotask(() => iniciarSistema(session));
        }
    } else {
        mostrarLogin();
    }
});


// Verificar sessão existente ao abrir a página

async function verificarSessao() {
    const { data, error } = await supabaseClient.auth.getSession();

    if (error) {
        console.error("Erro ao verificar sessão:", error);
        mostrarLogin();
        return;
    }

    if (data.session) {
        await iniciarSistema(data.session);
    } else {
        mostrarLogin();
    }
}


// ==========================================
// CATEGORIAS
// ==========================================

const categoriasGastos = [
    "Alimentação",
    "Moradia",
    "Transporte",
    "Saúde",
    "Lazer",
    "Contas",
    "Educação",
    "Compras",
    "Outros"
];

const categoriasEntradas = [
    "Salário",
    "Comissão",
    "Vendas",
    "Renda extra",
    "Investimentos",
    "Outros"
];


function atualizarCategorias() {
    const tipo = document.getElementById("tipo").value;
    const campoCategoria = document.getElementById("categoria");

    const categorias = tipo === "gasto"
        ? categoriasGastos
        : categoriasEntradas;

    campoCategoria.innerHTML = "";

    categorias.forEach(categoria => {
        const opcao = document.createElement("option");
        opcao.value = categoria;
        opcao.textContent = categoria;
        campoCategoria.appendChild(opcao);
    });
}


// ==========================================
// FORMATAÇÃO
// ==========================================

function formatarDinheiro(valor) {
    return Number(valor).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}


// ==========================================
// FILTRAR MOVIMENTAÇÕES DO MÊS
// ==========================================

function movimentacoesDoMes(lista) {
    return lista.filter(item =>
        item.data.startsWith(filtroMes.value)
    );
}


// ==========================================
// CALCULAR RESUMO
// ==========================================

function calcularResumo(lista) {
    let entradas = 0;
    let gastos = 0;

    lista.forEach(item => {
        if (item.tipo === "entrada") {
            entradas += Number(item.valor);
        } else {
            gastos += Number(item.valor);
        }
    });

    return {
        entradas,
        gastos,
        saldo: entradas - gastos
    };
}


// ==========================================
// ATUALIZAR CORES DO SALDO
// ==========================================


function atualizarSaldo(id, valor) {
    const elemento = document.getElementById(id);

    elemento.textContent = formatarDinheiro(valor);

    elemento.style.color =
        valor < 0 ? "#DC4545" : "#16875A";
}



// ==========================================
// PAINEL PRINCIPAL
// ==========================================


function atualizarDashboard() {
    const lista = movimentacoesDoMes(movimentacoes);

    // Separar as contas de casa
    const empresa = calcularResumo(
        lista.filter(item => item.area === "empresa")
    );

    // Separar as finanças pessoais
    const joao = calcularResumo(
        lista.filter(item => item.area === "joao")
    );

    // CONTAS DE CASA
    document.getElementById("entradasEmpresaDashboard").textContent =
        formatarDinheiro(empresa.entradas);

    document.getElementById("gastosEmpresaDashboard").textContent =
        formatarDinheiro(empresa.gastos);

    atualizarSaldo("saldoEmpresaDashboard", empresa.saldo);

    // FINANÇAS DO JOÃO
    document.getElementById("entradasJoaoDashboard").textContent =
        formatarDinheiro(joao.entradas);

    document.getElementById("gastosJoaoDashboard").textContent =
        formatarDinheiro(joao.gastos);

    atualizarSaldo("saldoJoaoDashboard", joao.saldo);

    // Cores das entradas e gastos
    document.getElementById("entradasEmpresaDashboard").style.color = "#16875A";
    document.getElementById("entradasJoaoDashboard").style.color = "#16875A";

    document.getElementById("gastosEmpresaDashboard").style.color = "#DC4545";
    document.getElementById("gastosJoaoDashboard").style.color = "#DC4545";

    // Manter os saldos dos cartões principais
    atualizarSaldo("saldoEmpresa", empresa.saldo);
    atualizarSaldo("saldoJoao", joao.saldo);

    atualizarRelatorioMensal();
    atualizarGraficoEvolucao();
}



// ==========================================
// ABRIR E FECHAR FINANCEIRO
// ==========================================

function abrirFinanceiro(area) {
    financeiroAtual = area;

    document.getElementById("dashboard").style.display = "none";
    document.getElementById("telaFinanceiro").style.display = "block";

    document.getElementById("tituloFinanceiro").textContent =
        area === "empresa"
            ? "Financeiro da Empresa"
            : "Financeiro do João";

    atualizarFinanceiro();
}


function voltarInicio() {
    document.getElementById("dashboard").style.display = "block";
    document.getElementById("telaFinanceiro").style.display = "none";

    financeiroAtual = "";

    atualizarDashboard();
}


// ==========================================
// ADICIONAR MOVIMENTAÇÃO NA NUVEM
// ==========================================

async function adicionarMovimentacao() {
    if (!usuarioAtual) {
        alert("Faça login novamente.");
        return;
    }

    if (!financeiroAtual) {
        alert("Selecione Empresa ou João primeiro.");
        return;
    }

    const tipo = document.getElementById("tipo").value;
    const categoria = document.getElementById("categoria").value;
    const descricao = document.getElementById("descricao").value.trim();
    const valor = Number(document.getElementById("valor").value);
    const data = document.getElementById("data").value;

    if (!descricao || !valor || valor <= 0 || !data) {
        alert("Preencha todos os campos corretamente.");
        return;
    }

    if (Number.isNaN(Date.parse(data + "T12:00:00"))) {
        alert("Informe uma data válida.");
        return;
    }

    if (!data.startsWith(filtroMes.value)) {
        alert("A data do lançamento precisa pertencer ao mês selecionado.");
        return;
    }

    const novaMovimentacao = {
        id: crypto.randomUUID(),
        user_id: usuarioAtual.id,
        area: financeiroAtual,
        tipo: tipo,
        categoria: categoria,
        descricao: descricao,
        valor: valor,
        data: data
    };

    try {
        const { data: registro, error } = await supabaseClient
            .from("movimentacoes")
            .insert([novaMovimentacao])
            .select()
            .single();

        if (error) {
            console.error("Erro ao salvar:", error);
            alert("Não foi possível salvar: " + error.message);
            return;
        }

        movimentacoes.push({
            ...registro,
            valor: Number(registro.valor)
        });

        document.getElementById("descricao").value = "";
        document.getElementById("valor").value = "";

        atualizarDashboard();
        atualizarFinanceiro();

        alert("Movimentação salva com sucesso!");

    } catch (erro) {
        console.error("Erro inesperado ao salvar:", erro);
        alert("Erro de conexão ao salvar. Tente novamente.");
    }
}


// ==========================================
// EDITAR MOVIMENTAÇÃO NA NUVEM
// ==========================================

async function editarMovimentacao(id) {
    const item = movimentacoes.find(m => m.id === id);

    if (!item) return;

    const novaDescricao = prompt(
        "Digite a nova descrição:",
        item.descricao
    );

    if (novaDescricao === null) return;

    const novoValor = prompt(
        "Digite o novo valor:",
        item.valor
    );

    if (novoValor === null) return;

    const valorConvertido = Number(novoValor.replace(",", "."));

    if (
        novaDescricao.trim() === "" ||
        !Number.isFinite(valorConvertido) ||
        valorConvertido <= 0
    ) {
        alert("Descrição ou valor inválido.");
        return;
    }

    try {
        const { error } = await supabaseClient
            .from("movimentacoes")
            .update({
                descricao: novaDescricao.trim(),
                valor: valorConvertido
            })
            .eq("id", id);

        if (error) {
            console.error("Erro ao editar:", error);
            alert("Não foi possível editar: " + error.message);
            return;
        }

        item.descricao = novaDescricao.trim();
        item.valor = valorConvertido;

        atualizarDashboard();
        atualizarFinanceiro();

    } catch (erro) {
        console.error("Erro inesperado ao editar:", erro);
        alert("Erro de conexão ao editar.");
    }
}


// ==========================================
// EXCLUIR MOVIMENTAÇÃO NA NUVEM
// ==========================================

async function excluirMovimentacao(id) {
    const confirmar = confirm(
        "Deseja realmente excluir esta movimentação?"
    );

    if (!confirmar) return;

    try {
        const { error } = await supabaseClient
            .from("movimentacoes")
            .delete()
            .eq("id", id);

        if (error) {
            console.error("Erro ao excluir:", error);
            alert("Não foi possível excluir: " + error.message);
            return;
        }

        movimentacoes = movimentacoes.filter(item => item.id !== id);

        atualizarDashboard();
        atualizarFinanceiro();

    } catch (erro) {
        console.error("Erro inesperado ao excluir:", erro);
        alert("Erro de conexão ao excluir.");
    }
}


// ==========================================
// GRÁFICO DE CATEGORIAS
// ==========================================

function atualizarGrafico(lista) {
    const grafico = document.getElementById("graficoCategorias");

    grafico.innerHTML = "";

    const gastos = lista.filter(item => item.tipo === "gasto");

    if (gastos.length === 0) {
        grafico.textContent = "Nenhum gasto registrado neste mês.";
        return;
    }

    const totais = {};

    gastos.forEach(item => {
        const categoria = item.categoria || "Sem categoria";

        if (!totais[categoria]) {
            totais[categoria] = 0;
        }

        totais[categoria] += Number(item.valor);
    });

    const categoriasOrdenadas = Object.entries(totais)
        .sort((a, b) => b[1] - a[1]);

    const totalGastos = gastos.reduce(
        (total, item) => total + Number(item.valor),
        0
    );

    categoriasOrdenadas.forEach(([categoria, valor]) => {
        const percentual = (valor / totalGastos) * 100;

        const linha = document.createElement("div");
        linha.className = "linha-categoria";

        const informacoes = document.createElement("div");
        informacoes.className = "info-categoria";

        const nome = document.createElement("span");
        nome.textContent = categoria;

        const valorTexto = document.createElement("strong");
        valorTexto.textContent = formatarDinheiro(valor);

        informacoes.appendChild(nome);
        informacoes.appendChild(valorTexto);

        const fundo = document.createElement("div");
        fundo.className = "barra-fundo";

        const barra = document.createElement("div");
        barra.className = "barra-progresso";
        barra.style.width = percentual + "%";

        fundo.appendChild(barra);

        const porcentagem = document.createElement("small");
        porcentagem.textContent = percentual.toFixed(1) + "%";

        linha.appendChild(informacoes);
        linha.appendChild(fundo);
        linha.appendChild(porcentagem);

        grafico.appendChild(linha);
    });
}


// ==========================================
// ATUALIZAR TELA FINANCEIRA
// ==========================================

function atualizarFinanceiro() {
    const lista = movimentacoesDoMes(movimentacoes)
        .filter(item => item.area === financeiroAtual);

    const resumo = calcularResumo(lista);

    document.getElementById("entradasArea").textContent =
        formatarDinheiro(resumo.entradas);

    document.getElementById("gastosArea").textContent =
        formatarDinheiro(resumo.gastos);

document.getElementById("entradasArea").style.color = "#16875A";
document.getElementById("gastosArea").style.color = "#DC4545";

    atualizarSaldo("saldoArea", resumo.saldo);

    atualizarGrafico(lista);

    const historico = document.getElementById("listaMovimentacoes");

    historico.innerHTML = "";

    if (lista.length === 0) {
        historico.textContent = "Nenhuma movimentação registrada neste mês.";
        return;
    }

    lista.sort((a, b) => b.data.localeCompare(a.data));

    lista.forEach(item => {
        const movimento = document.createElement("div");
        movimento.className = "movimentacao";

        const informacoes = document.createElement("div");

        const descricao = document.createElement("strong");
        descricao.textContent = item.descricao;

        const categoria = document.createElement("p");
        categoria.textContent = item.categoria || "Sem categoria";

        const data = document.createElement("small");
        data.textContent = item.data.split("-").reverse().join("/");

        informacoes.appendChild(descricao);
        informacoes.appendChild(categoria);
        informacoes.appendChild(data);

        const valor = document.createElement("strong");

        valor.textContent =
            (item.tipo === "entrada" ? "+ " : "- ") +
            formatarDinheiro(item.valor);

        valor.style.color =
            item.tipo === "entrada" ? "#27ae60" : "#e74c3c";

        const botoes = document.createElement("div");
        botoes.className = "botoes-movimentacao";

        const botaoEditar = document.createElement("button");
        botaoEditar.textContent = "Editar";
        botaoEditar.className = "botao-editar";
        botaoEditar.onclick = () => editarMovimentacao(item.id);

        const botaoExcluir = document.createElement("button");
        botaoExcluir.textContent = "Excluir";
        botaoExcluir.className = "botao-excluir";
        botaoExcluir.onclick = () => excluirMovimentacao(item.id);

        botoes.appendChild(botaoEditar);
        botoes.appendChild(botaoExcluir);

        movimento.appendChild(informacoes);
        movimento.appendChild(valor);
        movimento.appendChild(botoes);

        historico.appendChild(movimento);
    });
}


// ==========================================
// FILTRO DE MÊS
// ==========================================

filtroMes.addEventListener("change", () => {
    atualizarDashboard();

    if (financeiroAtual) {
        atualizarFinanceiro();
    }

    const campoData = document.getElementById("data");

    if (!campoData.value.startsWith(filtroMes.value)) {
        campoData.value = filtroMes.value + "-01";
    }
});


// ==========================================
// EXPORTAR BACKUP
// ==========================================

function exportarBackup() {
    const backup = {
        sistema: "Meu Financeiro",
        versao: 1,
        dataBackup: new Date().toISOString(),
        movimentacoes: movimentacoes
    };

    const arquivo = new Blob(
        [JSON.stringify(backup, null, 2)],
        { type: "application/json" }
    );

    const url = URL.createObjectURL(arquivo);

    const link = document.createElement("a");

    link.href = url;
    link.download = "backup-meu-financeiro.json";

    link.click();

    setTimeout(() => URL.revokeObjectURL(url), 1000);

    alert("Backup baixado com sucesso!");
}


// ==========================================
// IMPORTAR BACKUP PARA A NUVEM
// ==========================================

async function importarBackup(event) {
    const arquivo = event.target.files[0];

    if (!arquivo) return;

    const leitor = new FileReader();

    leitor.onload = async function(e) {
        try {
            const backup = JSON.parse(e.target.result);

            if (
                backup.sistema !== "Meu Financeiro" ||
                !Array.isArray(backup.movimentacoes)
            ) {
                throw new Error("Arquivo inválido.");
            }

            const dadosValidos = backup.movimentacoes.every(item =>
                item &&
                typeof item.id === "string" &&
                ["empresa", "joao"].includes(item.area) &&
                ["entrada", "gasto"].includes(item.tipo) &&
                typeof item.descricao === "string" &&
                item.descricao.trim() !== "" &&
                typeof item.valor === "number" &&
                Number.isFinite(item.valor) &&
                item.valor > 0 &&
                typeof item.data === "string" &&
                /^\d{4}-\d{2}-\d{2}$/.test(item.data) &&
                !Number.isNaN(Date.parse(item.data + "T12:00:00"))
            );

            if (!dadosValidos) {
                throw new Error("Movimentações inválidas.");
            }

            const confirmar = confirm(
                "Restaurar este backup substituirá todos os lançamentos atuais da sua conta. Deseja continuar?"
            );

            if (!confirmar) return;

            const registros = backup.movimentacoes.map(item => ({
                id: item.id,
                user_id: usuarioAtual.id,
                area: item.area,
                tipo: item.tipo,
                categoria: item.categoria || "Outros",
                descricao: item.descricao.trim(),
                valor: item.valor,
                data: item.data
            }));

            const { error: erroExclusao } = await supabaseClient
                .from("movimentacoes")
                .delete()
                .eq("user_id", usuarioAtual.id);

            if (erroExclusao) {
                throw erroExclusao;
            }

            if (registros.length > 0) {
                const { error: erroInsercao } = await supabaseClient
                    .from("movimentacoes")
                    .insert(registros);

                if (erroInsercao) {
                    throw erroInsercao;
                }
            }

            movimentacoes = registros.map(item => ({
                ...item,
                valor: Number(item.valor)
            }));

            atualizarDashboard();

            if (financeiroAtual) {
                atualizarFinanceiro();
            }

            alert("Backup restaurado com sucesso!");

        } catch (erro) {
            console.error("Erro ao restaurar backup:", erro);
            alert("Não foi possível restaurar o backup: " + erro.message);
        } finally {
            event.target.value = "";
        }
    };

    leitor.onerror = function() {
        alert("Erro ao ler o arquivo.");
        event.target.value = "";
    };

    leitor.readAsText(arquivo);
}


// ==========================================
// RELATÓRIO MENSAL
// ==========================================

function atualizarRelatorioMensal() {
    const mesSelecionado = filtroMes.value;

    if (!mesSelecionado) return;

    const listaEmpresa = movimentacoesDoMes(movimentacoes)
        .filter(item => item.area === "empresa");

    const resumoEmpresa = calcularResumo(listaEmpresa);

    document.getElementById("resultadoEmpresa").textContent =
        formatarDinheiro(resumoEmpresa.saldo);

    const listaJoao = movimentacoesDoMes(movimentacoes)
        .filter(item => item.area === "joao");

    const resumoJoao = calcularResumo(listaJoao);

    document.getElementById("resultadoJoao").textContent =
        formatarDinheiro(resumoJoao.saldo);

    const [ano, mes] = mesSelecionado.split("-").map(Number);

    const dataAnterior = new Date(ano, mes - 2, 1);

    const anoAnterior = dataAnterior.getFullYear();

    const mesAnterior = String(
        dataAnterior.getMonth() + 1
    ).padStart(2, "0");

    const referenciaAnterior = anoAnterior + "-" + mesAnterior;

    const listaAnterior = movimentacoes.filter(item =>
        item.data.startsWith(referenciaAnterior)
    );

    const resumoAnterior = calcularResumo(listaAnterior);

    document.getElementById("resultadoAnterior").textContent =
        formatarDinheiro(resumoAnterior.saldo);

    const gastos = movimentacoesDoMes(movimentacoes)
        .filter(item => item.tipo === "gasto");

    const totaisCategorias = {};

    gastos.forEach(item => {
        const categoria = item.categoria || "Sem categoria";

        if (!totaisCategorias[categoria]) {
            totaisCategorias[categoria] = 0;
        }

        totaisCategorias[categoria] += Number(item.valor);
    });

    const categoriasOrdenadas = Object.entries(totaisCategorias)
        .sort((a, b) => b[1] - a[1]);

    const campoMaiorCategoria =
        document.getElementById("maiorCategoria");

    if (categoriasOrdenadas.length > 0) {
        campoMaiorCategoria.textContent =
            categoriasOrdenadas[0][0] + " - " +
            formatarDinheiro(categoriasOrdenadas[0][1]);
    } else {
        campoMaiorCategoria.textContent = "Nenhuma";
    }
}


function atualizarGraficoEvolucao() {
    const grafico = document.getElementById("graficoEvolucao");
    const seletor = document.getElementById("filtroMesEvolucao");

    if (!grafico || !seletor) return;

    // Iniciar com o mês atual
    if (!seletor.value) {
        const hoje = new Date();

        seletor.value =
            hoje.getFullYear() + "-" +
            String(hoje.getMonth() + 1).padStart(2, "0");
    }

    const mesSelecionado = seletor.value;

    const movimentos = movimentacoes.filter(item =>
        item.data.startsWith(mesSelecionado)
    );

    const resumo = calcularResumo(movimentos);

    const maiorValor = Math.max(
        resumo.entradas,
        resumo.gastos,
        1
    );

    const [ano, mes] = mesSelecionado.split("-").map(Number);

    const nomeMes = new Date(ano, mes - 1, 1)
        .toLocaleDateString("pt-BR", {
            month: "long",
            year: "numeric"
        });

    grafico.innerHTML = "";

    const titulo = document.createElement("h3");
    titulo.className = "titulo-mes-evolucao";
    titulo.textContent =
        nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1);

    grafico.appendChild(titulo);

    function criarIndicador(nome, valor, classe) {
        const grupo = document.createElement("div");
        grupo.className = "indicador-evolucao";

        const informacoes = document.createElement("div");
        informacoes.className = "info-evolucao";

        const nomeTexto = document.createElement("span");
        nomeTexto.textContent = nome;

        const valorTexto = document.createElement("strong");
        valorTexto.textContent = formatarDinheiro(valor);

        informacoes.appendChild(nomeTexto);
        informacoes.appendChild(valorTexto);

        const fundo = document.createElement("div");
        fundo.className = "barra-evolucao-fundo";

        const barra = document.createElement("div");
        barra.className = classe;

        barra.style.width =
            (valor / maiorValor * 100) + "%";

        fundo.appendChild(barra);

        grupo.appendChild(informacoes);
        grupo.appendChild(fundo);

        return grupo;
    }

    grafico.appendChild(
        criarIndicador(
            "Entradas",
            resumo.entradas,
            "barra-evolucao-entrada"
        )
    );

    grafico.appendChild(
        criarIndicador(
            "Gastos",
            resumo.gastos,
            "barra-evolucao-gasto"
        )
    );

    if (movimentos.length === 0) {
        const mensagem = document.createElement("p");
        mensagem.className = "mensagem-evolucao";
        mensagem.textContent =
            "Nenhuma movimentação registrada neste mês.";

        grafico.appendChild(mensagem);
    }
}

// Atualizar o gráfico quando escolher outro mês
document.getElementById("filtroMesEvolucao")
    .addEventListener("change", atualizarGraficoEvolucao);


// ==========================================
// INICIALIZAÇÃO
// ==========================================

atualizarCategorias();
verificarSessao();
