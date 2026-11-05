
let movimentacoes = JSON.parse(localStorage.getItem("movimentacoes")) || [];

let financeiroAtual = "";

const filtroMes = document.getElementById("filtroMes");

const hoje = new Date();

filtroMes.value =
    hoje.getFullYear() + "-" +
    String(hoje.getMonth() + 1).padStart(2, "0");

document.getElementById("data").value =
    hoje.toISOString().split("T")[0];


// CATEGORIAS

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


// FORMATAÇÃO DE VALORES

function formatarDinheiro(valor) {
    return Number(valor).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}


// SALVAR DADOS

function salvarDados() {
    localStorage.setItem(
        "movimentacoes",
        JSON.stringify(movimentacoes)
    );
}


// FILTRAR MOVIMENTAÇÕES DO MÊS

function movimentacoesDoMes(lista) {
    return lista.filter(item =>
        item.data.startsWith(filtroMes.value)
    );
}


// CALCULAR RESUMO

function calcularResumo(lista) {
    let entradas = 0;
    let gastos = 0;

    lista.forEach(item => {
        if (item.tipo === "entrada") {
            entradas += item.valor;
        } else {
            gastos += item.valor;
        }
    });

    return {
        entradas,
        gastos,
        saldo: entradas - gastos
    };
}


// ATUALIZAR CORES DO SALDO

function atualizarSaldo(id, valor) {
    const elemento = document.getElementById(id);

    elemento.textContent = formatarDinheiro(valor);

    if (valor < 0) {
        elemento.style.color = "#e74c3c";
    } else {
        elemento.style.color = "#27ae60";
    }
}


// ATUALIZAR PAINEL PRINCIPAL

function atualizarDashboard() {
    const lista = movimentacoesDoMes(movimentacoes);

    const resumo = calcularResumo(lista);

    document.getElementById("totalEntradas").textContent =
        formatarDinheiro(resumo.entradas);

    document.getElementById("totalGastos").textContent =
        formatarDinheiro(resumo.gastos);

    atualizarSaldo("saldoTotal", resumo.saldo);

    const empresa = calcularResumo(
        lista.filter(item => item.area === "empresa")
    );

    const joao = calcularResumo(
        lista.filter(item => item.area === "joao")
    );

    atualizarSaldo("saldoEmpresa", empresa.saldo);
    atualizarSaldo("saldoJoao", joao.saldo);

    atualizarRelatorioMensal();
    atualizarGraficoEvolucao();
}


// ABRIR FINANCEIRO

function abrirFinanceiro(area) {
    financeiroAtual = area;

    document.getElementById("dashboard").style.display = "none";
    document.getElementById("telaFinanceiro").style.display = "block";

    document.getElementById("tituloFinanceiro").textContent =
        area === "empresa" ? "Financeiro da Empresa" : "Financeiro do João";

    atualizarFinanceiro();
}


// VOLTAR AO INÍCIO

function voltarInicio() {
    document.getElementById("dashboard").style.display = "block";
    document.getElementById("telaFinanceiro").style.display = "none";

    financeiroAtual = "";

    atualizarDashboard();
}


// ADICIONAR MOVIMENTAÇÃO

function adicionarMovimentacao() {
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
        area: financeiroAtual,
        tipo: tipo,
        categoria: categoria,
        descricao: descricao,
        valor: valor,
        data: data
    };

    movimentacoes.push(novaMovimentacao);

    salvarDados();

    document.getElementById("descricao").value = "";
    document.getElementById("valor").value = "";

    atualizarDashboard();
    atualizarFinanceiro();
}


// EDITAR MOVIMENTAÇÃO

function editarMovimentacao(id) {
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

    item.descricao = novaDescricao.trim();
    item.valor = valorConvertido;

    salvarDados();

    atualizarDashboard();
    atualizarFinanceiro();
}


// EXCLUIR MOVIMENTAÇÃO

function excluirMovimentacao(id) {
    const confirmar = confirm(
        "Deseja realmente excluir esta movimentação?"
    );

    if (!confirmar) return;

    movimentacoes = movimentacoes.filter(item => item.id !== id);

    salvarDados();

    atualizarDashboard();
    atualizarFinanceiro();
}


// ATUALIZAR GRÁFICO DE CATEGORIAS

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

        totais[categoria] += item.valor;
    });

    const categoriasOrdenadas = Object.entries(totais)
        .sort((a, b) => b[1] - a[1]);

    const totalGastos = gastos.reduce(
        (total, item) => total + item.valor,
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


// ATUALIZAR TELA FINANCEIRA

function atualizarFinanceiro() {
    const lista = movimentacoesDoMes(movimentacoes)
        .filter(item => item.area === financeiroAtual);

    const resumo = calcularResumo(lista);

    document.getElementById("entradasArea").textContent =
        formatarDinheiro(resumo.entradas);

    document.getElementById("gastosArea").textContent =
        formatarDinheiro(resumo.gastos);

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


// FILTRO DE MÊS

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


// EXPORTAR BACKUP

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


// IMPORTAR BACKUP

function importarBackup(event) {
    const arquivo = event.target.files[0];

    if (!arquivo) return;

    const leitor = new FileReader();

    leitor.onload = function(e) {
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
                "Restaurar este backup substituirá todos os lançamentos atuais. Deseja continuar?"
            );

            if (!confirmar) return;

            movimentacoes = backup.movimentacoes;

            salvarDados();

            atualizarDashboard();

            if (financeiroAtual) {
                atualizarFinanceiro();
            }

            alert("Backup restaurado com sucesso!");

        } catch (erro) {
            alert("Não foi possível restaurar o backup. Verifique o arquivo.");
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


// INICIALIZAÇÃO

atualizarCategorias();
atualizarDashboard();


// ===== RELATÓRIO MENSAL =====

function atualizarRelatorioMensal() {

    const mesSelecionado = filtroMes.value;

    if (!mesSelecionado) return;

    // Resultado da Empresa

    const listaEmpresa = movimentacoesDoMes(movimentacoes)
        .filter(item => item.area === "empresa");

    const resumoEmpresa = calcularResumo(listaEmpresa);

    document.getElementById("resultadoEmpresa").textContent =
        formatarDinheiro(resumoEmpresa.saldo);


    // Resultado do João

    const listaJoao = movimentacoesDoMes(movimentacoes)
        .filter(item => item.area === "joao");

    const resumoJoao = calcularResumo(listaJoao);

    document.getElementById("resultadoJoao").textContent =
        formatarDinheiro(resumoJoao.saldo);


    // Resultado do mês anterior

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


    // Maior categoria de gastos

    const gastos = movimentacoesDoMes(movimentacoes)
        .filter(item => item.tipo === "gasto");

    const totaisCategorias = {};

    gastos.forEach(item => {

        const categoria = item.categoria || "Sem categoria";

        if (!totaisCategorias[categoria]) {
            totaisCategorias[categoria] = 0;
        }

        totaisCategorias[categoria] += item.valor;

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


// ===== GRÁFICO DE EVOLUÇÃO =====

function atualizarGraficoEvolucao() {

    const grafico = document.getElementById("graficoEvolucao");

    if (!grafico) return;

    grafico.innerHTML = "";

    const [ano, mes] = filtroMes.value.split("-").map(Number);

    const meses = [];

    // Buscar os últimos 6 meses, incluindo o selecionado

    for (let i = 5; i >= 0; i--) {

        const data = new Date(ano, mes - 1 - i, 1);

        const anoMes =
            data.getFullYear() + "-" +
            String(data.getMonth() + 1).padStart(2, "0");

        const nomeMes = data.toLocaleDateString("pt-BR", {
            month: "short",
            year: "2-digit"
        });

        const movimentos = movimentacoes.filter(item =>
            item.data.startsWith(anoMes)
        );

        const resumo = calcularResumo(movimentos);

        meses.push({
            nome: nomeMes,
            entradas: resumo.entradas,
            gastos: resumo.gastos
        });
    }

    const maiorValor = Math.max(
        1,
        ...meses.flatMap(m => [m.entradas, m.gastos])
    );

    meses.forEach(mes => {

        const linha = document.createElement("div");
        linha.className = "mes-grafico";

        const titulo = document.createElement("strong");
        titulo.className = "nome-mes";
        titulo.textContent = mes.nome;

        const barras = document.createElement("div");
        barras.className = "grupo-barras";

        const entrada = document.createElement("div");
        entrada.className = "barra-entrada";
        entrada.style.width =
            (mes.entradas / maiorValor * 100) + "%";

        const gasto = document.createElement("div");
        gasto.className = "barra-gasto";
        gasto.style.width =
            (mes.gastos / maiorValor * 100) + "%";

        const valores = document.createElement("div");
        valores.className = "valores-grafico";

        valores.textContent =
            "Entradas: " + formatarDinheiro(mes.entradas) +
            " | Gastos: " + formatarDinheiro(mes.gastos);

        barras.appendChild(entrada);
        barras.appendChild(gasto);

        linha.appendChild(titulo);
        linha.appendChild(barras);
        linha.appendChild(valores);

        grafico.appendChild(linha);

    });

}
