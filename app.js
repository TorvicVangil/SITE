const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const fs = require("fs");
const AdmZip = require("adm-zip");
const path = require("path");
const { Pool } = require("pg");

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Servir arquivos estáticos da pasta 'public'
app.use(express.static(path.join(__dirname, 'public')));

const ZIP_PATH = "holerites.zip";

// Conexão com PostgreSQL
const pool = new Pool({
  host: process.env.PG_HOST,
  port: process.env.PG_PORT,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE,
  ssl: {
      rejectUnauthorized: false
  }
});



// Rota principal (para ver se o servidor está no ar)
app.get("/", (req, res) => {
    res.send("Servidor está rodando 🚀");
});

// Rota para página de login
app.get("/login", (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Rota para página do painel
app.get("/painel", (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'painel.html'));
});

// Rota de login (ainda verifica se matrícula e senha estão corretos)
app.post("/login", async (req, res) => {
    const { matricula, senha } = req.body;

    try {
        const result = await pool.query(
            "SELECT nome FROM usuarios WHERE matricula = $1 AND senha = $2",
            [matricula, senha]
        );

        if (result.rows.length > 0) {
            return res.json({ nome: result.rows[0].nome });
        } else {
            return res.status(401).json({ error: "Matrícula ou senha inválidos" });
        }
    } catch (error) {
        console.error("Erro no login:", error);
        res.status(500).json({ error: "Erro interno do servidor" });
    }
});

// Rota para dados do usuário (matrícula vem do body agora)
app.post("/painel", async (req, res) => {
    const { matricula } = req.body;

    try {
        const result = await pool.query(
            "SELECT nome, salario FROM usuarios WHERE matricula = $1",
            [matricula]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Usuário não encontrado" });
        }

        const { nome, salario } = result.rows[0];
        const holerite = listarArquivosHolerite(matricula);
        res.json({ nome, salario, holerite });

    } catch (error) {
        console.error("Erro ao buscar dados:", error);
        res.status(500).json({ error: "Erro interno do servidor" });
    }
});

// Listar arquivos do ZIP por matrícula
function listarArquivosHolerite(matricula) {
    if (!fs.existsSync(ZIP_PATH)) return [];

    const zip = new AdmZip(ZIP_PATH);
    const zipEntries = zip.getEntries();

    const arquivosUsuario = zipEntries
        .filter(entry => entry.entryName.startsWith(`${matricula}/`) && !entry.isDirectory)
        .map(entry => entry.entryName.replace(`${matricula}/`, ""));

    return arquivosUsuario;
}

// Download de arquivo (matrícula passada na query)
app.get("/download", (req, res) => {
    const { arquivo, matricula } = req.query;

    if (!fs.existsSync(ZIP_PATH)) {
        return res.status(404).json({ error: "Arquivo ZIP não encontrado" });
    }

    const zip = new AdmZip(ZIP_PATH);
    const arquivoSeguro = path.basename(arquivo);
    const fileEntry = zip.getEntry(`${matricula}/${arquivoSeguro}`);

    if (!fileEntry) {
        return res.status(404).json({ error: "Arquivo não encontrado para este usuário" });
    }

    const fileBuffer = zip.readFile(fileEntry);
    res.setHeader("Content-Disposition", `attachment; filename=${arquivoSeguro}`);
    res.send(fileBuffer);
});

// Tratamento global de erros
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: "Erro interno do servidor" });
});

// Inicializar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});