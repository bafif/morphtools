/* eslint-disable no-console */
import * as fs from "fs";

import path from "path";

import { Project } from "ts-morph";

import { mermaidClasses, mermaidFunctions, mermaidConsvars } from "./lib/in_file";

// Contador global para generar IDs únicos
let uniqueIdCounter = 0;

function generateMermaidDiagram(projectPath: string, outputFile: string): void {
  // Validar que el tsconfig.json exista
  const tsConfigPath = `${projectPath}/tsconfig.json`;
  if (!fs.existsSync(tsConfigPath)) {
    throw new Error(`No se encontró tsconfig.json en ${projectPath}`);
  }

  // Inicializar el proyecto con ts-morph
  const project = new Project({
    tsConfigFilePath: `${projectPath}/tsconfig.json`,
    skipAddingFilesFromTsConfig: false,
  });

  // Obtener todos los archivos TypeScript
  const sourceFiles = project.getSourceFiles();

  // Conjuntos para nodos y relaciones
  const nodes: Set<string> = new Set();
  const edges: Set<string> = new Set();

  // Analizar cada archivo
  for (const sourceFile of sourceFiles) {
    //const fileName = sourceFile.getBaseName();

    // Clases
    uniqueIdCounter = mermaidClasses({
      file: sourceFile,
      nodes,
      edges,
      uniqueIdCounter,
    });

    // Funciones
    uniqueIdCounter = mermaidFunctions({
      file: sourceFile,
      nodes,
      edges,
      uniqueIdCounter,
    });

    // Constantes y variables
    uniqueIdCounter = mermaidConsvars({
      file: sourceFile,
      nodes,
      edges,
      uniqueIdCounter,
    });

    // Importaciones

  }

  // Escribir el diagrama Mermaid
  const mermaid = ["---"];
  mermaid.push(`title: ${path.basename(projectPath)}`);
  mermaid.push(`---`);
  mermaid.push(`graph TD`);
  for (const node of Array.from(nodes).sort()) {
    mermaid.push(`    ${node}`);
  }
  for (const edge of Array.from(edges).sort()) {
    mermaid.push(`    ${edge}`);
  }

  fs.writeFileSync(outputFile, mermaid.join("\n"));
  console.log(`Diagrama Mermaid generado en ${outputFile}`);
}

if (require.main === module) {
  // Leer el workspace desde los argumentos de la línea de comandos
  const args = process.argv.slice(2); // Ignora node y el nombre del script
  if (args.length < 1) {
    console.error(
      "Uso: npx ts-node generate_mermaid_diagram.ts <workspace_path> [output_path]",
    );
    process.exit(1);
  }

  const projectPath = args[0]; // Primer argumento: workspace
  const outputFile = args[1] || "interdependencies.mmd"; // Segundo argumento opcional: archivo de salida

  try {
    generateMermaidDiagram(projectPath, outputFile);
  } catch (error) {
    // Verificar si error es una instancia de Error
    if (error instanceof Error) {
      console.error(`Error al generar el diagrama: ${error.message}`);
    } else {
      console.error(`Error al generar el diagrama: ${String(error)}`);
    }
    process.exit(1);
  }
}
