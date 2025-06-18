import { SyntaxKind, Node } from "ts-morph";

import type { SourceFile } from "ts-morph";

// Función para generar un ID único para nodos
export function getNodeId({
  node,
  uniqueIdCounter,
}: {
  node: Node;
  uniqueIdCounter: number;
}): { name: string; id: number } {
  // Verificar el tipo de nodo con type narrowing
  if (Node.isClassDeclaration(node)) {
    const output = {
      name: node.getName() || `nn_class_${uniqueIdCounter++}`,
      id: uniqueIdCounter,
    };
    return output;
  } else if (Node.isFunctionDeclaration(node)) {
    const output = {
      name: node.getName() || `nn_function_${uniqueIdCounter++}`,
      id: uniqueIdCounter,
    };
    return output;
  } else if (Node.isVariableDeclaration(node)) {
    const output = {
      name: node.getName(),
      id: uniqueIdCounter,
    };
    return output;
  }
  // Fallback para otros nodos
  const output = {
    name: `node_${uniqueIdCounter++}`,
    id: uniqueIdCounter,
  };
  return output;
}

// Función para analizar las clases
export function mermaidClasses({
  file,
  nodes,
  edges,
  uniqueIdCounter,
}: {
  file: SourceFile;
  nodes: Set<string>;
  edges: Set<string>;
  uniqueIdCounter: number;
}): number {
  for (const cls of file.getClasses()) {
    const classBoth = getNodeId({ node: cls, uniqueIdCounter });
    const className = `X_${classBoth.name}`;
    uniqueIdCounter = classBoth.id;
    nodes.add(`${className}[${className}::class]`);

    // Herencias
    const baseClass = cls.getBaseClass();
    if (baseClass) {
      const baseClassBoth = getNodeId({
        node: baseClass,
        uniqueIdCounter,
      });
      const baseClassName = `X_${baseClassBoth.name}`;
      uniqueIdCounter = baseClassBoth.id;
      nodes.add(`${baseClassName}[${baseClassName}::class]`);
      edges.add(`${className} -->|extends| ${baseClassName}`);
    }
  }
  return uniqueIdCounter;
}

export function mermaidFunctions({
  nodes,
  edges,
  file,
  uniqueIdCounter,
}: {
  nodes: Set<string>;
  edges: Set<string>;
  file: SourceFile;
  uniqueIdCounter: number;
}): number {
  for (const func of file.getFunctions()) {
    const funcBoth = getNodeId({ node: func, uniqueIdCounter });
    const funcName = `X_${funcBoth.name}`;
    nodes.add(`${funcName}(${funcName}::function)`);

    // Buscar referencias a otras funciones, clases o variables
    for (const identifier of func.getDescendantsOfKind(SyntaxKind.Identifier)) {
      // const refName = identifier.getText();
      const refSymbol = identifier.getSymbol();
      if (refSymbol) {
        const decls = refSymbol.getDeclarations();
        for (const decl of decls) {
          if (
            decl.getKind() === SyntaxKind.FunctionDeclaration ||
            decl.getKind() === SyntaxKind.ClassDeclaration ||
            decl.getKind() === SyntaxKind.VariableDeclaration
          ) {
            const refIdBoth = getNodeId({ node: decl, uniqueIdCounter });
            const refId = `X_${refIdBoth.name}`;
            if (refId !== funcName) {
              nodes.add(`${refId}[${refId}::${decl.getKindName()}]`);
              edges.add(`${funcName} -->|uses| ${refId}`);
            }
          }
        }
      }
    }
  }
  return uniqueIdCounter;
}

export function mermaidConsvars({
  file,
  nodes,
  edges,
  uniqueIdCounter,
}: {
  file: SourceFile;
  nodes: Set<string>;
  edges: Set<string>;
  uniqueIdCounter: number;
}): number {
  for (const varDecl of file.getVariableDeclarations()) {
    const Both = getNodeId({ node: varDecl, uniqueIdCounter });
    const name = `X_${Both.name}`;
    uniqueIdCounter = Both.id;
    // Determinar si es const, let o var
    let kind: string;
    const parent = varDecl.getParentOrThrow();
    if (Node.isVariableStatement(parent)) {
      if (parent.hasModifier(SyntaxKind.ConstKeyword)) {
        kind = "const";
        nodes.add(`${name}[${name}::${kind}]`);
      } else if (parent.hasModifier(SyntaxKind.LetKeyword)) {
        kind = "let";
        nodes.add(`${name}[${name}::${kind}]`);
      } else if (parent.hasModifier(SyntaxKind.VarKeyword)) {
        kind = "var";
        nodes.add(`${name}[${name}::${kind}]`);
      } else {
        // Fallback para casos raros
        kind = "other_var";
      }
    } else {
      // Buscar referencias
      for (const identifier of varDecl.getDescendantsOfKind(
        SyntaxKind.Identifier,
      )) {
        //const refName = identifier.getText();
        const refSymbol = identifier.getSymbol();
        if (refSymbol) {
          const decls = refSymbol.getDeclarations();
          for (const decl of decls) {
            if (
              Node.isClassDeclaration(decl) ||
              Node.isFunctionDeclaration(decl) ||
              Node.isVariableDeclaration(decl)
            ) {
              const refIdBoth = getNodeId({ node: decl, uniqueIdCounter });
              const refId = `X_${refIdBoth.name}`;
              uniqueIdCounter = refIdBoth.id;
              if (refId !== name) {
                nodes.add(`${refId}[${refId}::${decl.getKindName()}]`);
                edges.add(`${name} -->|uses| ${refId}`);
              }
            }
          }
        }
      }
    }
  }
  return uniqueIdCounter;
}

export function mermaidImports({
  file,
  nodes,
  edges,
}: {
  file: SourceFile;
  nodes: Set<string>;
  edges: Set<string>;
}): void {
  for (const imp of file.getImportDeclarations()) {
    const moduleSpecifier = imp.getModuleSpecifierValue().replace(/[@]/g, "");
    for (const namedImport of imp.getNamedImports()) {
      let importName = namedImport.getName();
      importName = `X_${importName}`;
      nodes.add(`${importName}[${importName}::import]`);
      nodes.add(`${moduleSpecifier}[${moduleSpecifier}::module]`);
      edges.add(`${importName} -->|imported_from| ${moduleSpecifier}`);
    }
  }
}
