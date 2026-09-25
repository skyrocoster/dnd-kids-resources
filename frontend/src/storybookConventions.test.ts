import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const sourceRoot = dirname(fileURLToPath(import.meta.url));
const statusTagByRoot = {
  "In Development": "status-in-development",
  Production: "status-production",
  Reference: "status-reference",
} as const;

function filesUnder(directory: string, include: (name: string) => boolean): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return filesUnder(path, include);
    return include(entry.name) ? [path] : [];
  });
}

function parse(filePath: string): ts.SourceFile {
  return ts.createSourceFile(
    filePath,
    readFileSync(filePath, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
}

function resolveRelativeModule(filePath: string, moduleName: string): string | null {
  const base = resolve(dirname(filePath), moduleName);
  const candidates = [base, `${base}.ts`, `${base}.tsx`, join(base, "index.ts"), join(base, "index.tsx")];
  return candidates.find((path) => existsSync(path) && statSync(path).isFile()) ?? null;
}

function reachableFromStories(storyFiles: string[]): Set<string> {
  const reached = new Set<string>();
  const pending = [...storyFiles];
  while (pending.length) {
    const path = pending.pop()!;
    if (reached.has(path)) continue;
    reached.add(path);
    for (const statement of parse(path).statements) {
      if (!ts.isImportDeclaration(statement) && !ts.isExportDeclaration(statement)) continue;
      const specifier = statement.moduleSpecifier;
      if (!specifier || !ts.isStringLiteral(specifier) || !specifier.text.startsWith(".")) continue;
      const dependency = resolveRelativeModule(path, specifier.text);
      if (dependency) pending.push(dependency);
    }
  }
  return reached;
}

function unwrap(expression: ts.Expression): ts.Expression {
  return ts.isAsExpression(expression) || ts.isParenthesizedExpression(expression) || ts.isSatisfiesExpression(expression)
    ? unwrap(expression.expression)
    : expression;
}

function propertyName(property: ts.ObjectLiteralElementLike): string | undefined {
  const name = property.name;
  return name && (ts.isIdentifier(name) || ts.isStringLiteral(name)) ? name.text : undefined;
}

function propertyValue(object: ts.ObjectLiteralExpression, name: string): ts.Expression | undefined {
  const property = object.properties.find(
    (candidate) => ts.isPropertyAssignment(candidate) && propertyName(candidate) === name,
  );
  return property && ts.isPropertyAssignment(property) ? unwrap(property.initializer) : undefined;
}

function literalString(expression: ts.Expression | undefined): string | undefined {
  return expression && (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression))
    ? expression.text
    : undefined;
}

function defaultMeta(source: ts.SourceFile): ts.ObjectLiteralExpression | undefined {
  const assignment = source.statements.find(ts.isExportAssignment);
  if (!assignment) return undefined;
  const value = unwrap(assignment.expression);
  if (ts.isObjectLiteralExpression(value)) return value;
  if (!ts.isIdentifier(value)) return undefined;
  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    const declaration = statement.declarationList.declarations.find(
      (candidate) => ts.isIdentifier(candidate.name) && candidate.name.text === value.text,
    );
    if (!declaration?.initializer) continue;
    const initializer = unwrap(declaration.initializer);
    return ts.isObjectLiteralExpression(initializer) ? initializer : undefined;
  }
  return undefined;
}

function storyObjects(source: ts.SourceFile) {
  return source.statements.flatMap((statement) => {
    if (
      !ts.isVariableStatement(statement) ||
      !statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)
    ) {
      return [];
    }
    return statement.declarationList.declarations.flatMap((declaration) => {
      if (!ts.isIdentifier(declaration.name) || !declaration.initializer) return [];
      const value = unwrap(declaration.initializer);
      return ts.isObjectLiteralExpression(value)
        ? [{ exportName: declaration.name.text, value }]
        : [];
    });
  });
}

function displayName(exportName: string): string {
  const words = exportName.replace(/_/g, " ").replace(/([a-z\d])([A-Z])/g, "$1 $2");
  return `${words.charAt(0).toUpperCase()}${words.slice(1)}`;
}

function collectViewportReferences(source: ts.SourceFile): string[] {
  const references: string[] = [];
  function visit(node: ts.Node) {
    if (ts.isPropertyAssignment(node) && propertyName(node) === "defaultViewport") {
      const value = literalString(unwrap(node.initializer));
      if (value) references.push(value);
    }
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "storyViewport") {
      const value = node.arguments[0] && literalString(unwrap(node.arguments[0]));
      if (value) references.push(value);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return references;
}

const storyFiles = filesUnder(sourceRoot, (name) => /\.stories\.tsx?$/.test(name));

describe("Storybook conventions", () => {
  it("discovers the repository's story files", () => {
    const config = readFileSync(join(sourceRoot, "..", ".storybook", "main.ts"), "utf8");
    expect(config).toContain("../src/**/*.stories.@(js|jsx|mjs|ts|tsx)");
    expect(storyFiles.length).toBeGreaterThan(0);
  });

  it("keeps every application TSX module reachable from a story", () => {
    const reached = reachableFromStories(storyFiles);
    const componentFiles = filesUnder(sourceRoot, (name) => name.endsWith(".tsx"))
      .filter((path) => !/(?:\.test|\.stories)\.tsx$/.test(path))
      .filter((path) => !path.includes(`${join("src", "test")}${process.platform === "win32" ? "\\" : "/"}`))
      .filter((path) => !["main.tsx", "router.tsx"].includes(relative(sourceRoot, path)));
    const missing = componentFiles
      .filter((path) => !reached.has(path))
      .map((path) => relative(sourceRoot, path).replaceAll("\\", "/"))
      .sort();
    expect(missing).toEqual([]);
  });

  it("uses ordered top-level categories, matching status tags, and unique story names", () => {
    const errors: string[] = [];
    const namesByTitle = new Map<string, Map<string, string>>();
    for (const path of storyFiles) {
      const file = relative(sourceRoot, path).replaceAll("\\", "/");
      const source = parse(path);
      const meta = defaultMeta(source);
      if (!meta) {
        errors.push(`${file}: default export must resolve to a metadata object`);
        continue;
      }
      const title = literalString(propertyValue(meta, "title"));
      if (!title) {
        errors.push(`${file}: metadata must have a literal title`);
        continue;
      }
      const root = title.split("/")[0] as keyof typeof statusTagByRoot;
      const expectedTag = statusTagByRoot[root];
      if (!expectedTag) errors.push(`${file}: title must begin with Production, In Development, or Reference`);
      const tagsValue = propertyValue(meta, "tags");
      const tags = tagsValue && ts.isArrayLiteralExpression(tagsValue)
        ? tagsValue.elements.flatMap((element) => {
            const value = literalString(element);
            return value ? [value] : [];
          })
        : [];
      const statusTags = tags.filter((tag) => tag.startsWith("status-"));
      if (statusTags.length !== 1 || statusTags[0] !== expectedTag) {
        errors.push(`${file}: ${title} must have exactly the tag ${expectedTag}`);
      }
      const names = namesByTitle.get(title) ?? new Map<string, string>();
      namesByTitle.set(title, names);
      const stories = storyObjects(source);
      if (!stories.length) errors.push(`${file}: must export at least one story`);
      for (const { exportName, value } of stories) {
        const explicitName = literalString(propertyValue(value, "name"));
        const name = explicitName ?? displayName(exportName);
        if (!name.trim()) errors.push(`${file}: ${exportName} must have a non-empty display name`);
        if (explicitName?.includes(" - ")) errors.push(`${file}: ${exportName} must use an em dash instead of a spaced hyphen`);
        const previous = names.get(name);
        if (previous) errors.push(`${file}: ${exportName} duplicates "${name}" from ${previous}`);
        else names.set(name, `${file}:${exportName}`);
      }
    }
    expect(errors).toEqual([]);
  });

  it("uses only the shared viewport presets", () => {
    const viewportFile = join(sourceRoot, "storybook", "viewports.ts");
    const catalogueSource = parse(viewportFile);
    const catalogueNames = new Set<string>();
    function visit(node: ts.Node) {
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === "storybookViewports" && node.initializer) {
        const object = unwrap(node.initializer);
        if (ts.isObjectLiteralExpression(object)) {
          for (const property of object.properties) {
            const name = propertyName(property);
            if (name) catalogueNames.add(name);
          }
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(catalogueSource);
    const invalid = storyFiles.flatMap((path) =>
      collectViewportReferences(parse(path))
        .filter((name) => !catalogueNames.has(name))
        .map((name) => `${relative(sourceRoot, path)}: unknown viewport "${name}"`),
    );
    expect(catalogueNames.size).toBeGreaterThan(0);
    expect(invalid).toEqual([]);
  });
});
