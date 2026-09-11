const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// Como usar:
// 1. Abra o terminal na pasta do projeto
// 2. Se for a primeira vez usando, instale a biblioteca sharp com o comando: npm install sharp
// 3. Execute o script passando o caminho da imagem: node otimizar_imagem.js "images/sua_imagem.png"

// Verifica se os argumentos foram passados
if (process.argv.length < 3) {
    console.error('Uso correto: node otimizar_imagem.js <caminho_da_imagem_original> [caminho_da_imagem_destino]');
    process.exit(1);
}

const inputPath = process.argv[2];

// Se o destino não for especificado, cria um na mesma pasta com extensão .webp
let outputPath = process.argv[3];
if (!outputPath) {
    const parsedPath = path.parse(inputPath);
    outputPath = path.join(parsedPath.dir, `${parsedPath.name}.webp`);
}

// Verifica se o arquivo de entrada existe
if (!fs.existsSync(inputPath)) {
    console.error(`Erro: O arquivo "${inputPath}" não foi encontrado.`);
    process.exit(1);
}

console.log(`Iniciando otimização: ${inputPath}...`);

// Converte para webp com qualidade 80
sharp(inputPath)
    .webp({ quality: 80 })
    .toFile(outputPath)
    .then(info => {
        console.log('✅ Sucesso! Imagem convertida e otimizada.');
        console.log(`Salvo em: ${outputPath}`);
        console.log(`Tamanho final: ${(info.size / 1024).toFixed(2)} KB`);
    })
    .catch(err => {
        console.error('❌ Erro ao converter a imagem:');
        console.error(err);
    });
