const fs = require('fs');

// Read the TypeScript source
let content = fs.readFileSync('src/index.ts', 'utf8');

// Remove TypeScript-specific syntax
content = content
    // Fix BigInt prototype
    .replace(/(BigInt\.prototype as any)/g, 'BigInt.prototype')

    // Remove type annotations from function parameters and return types
    .replace(/: Promise<[^>]*>/g, '')
    .replace(/: any\b/g, '')
    .replace(/: number\b/g, '')
    .replace(/: string\b/g, '')
    .replace(/: boolean\b/g, '')
    .replace(/: void\b/g, '')
    .replace(/: Record<[^>]*>/g, '')
    .replace(/: Array<[^>]*>/g, '')
    .replace(/: Uint8Array/g, '')

    // Fix array type annotations like `: any[]`
    .replace(/:\s*any\[\]/g, '')
    .replace(/:\s*string\[\]/g, '')
    .replace(/:\s*number\[\]/g, '')
    .replace(/:\s*boolean\[\]/g, '')

    // Remove interface declarations (multiline)
    .replace(/interface\s+\w+\s*{[^}]*}/gs, '')

    // Remove type assertions
    .replace(/\s+as\s+\w+/g, '')

    // Remove optional parameter markers
    .replace(/\?\s*:/g, ':')
    .replace(/\?\s*\)/g, ')')
    .replace(/\?\s*,/g, ',')

    // Fix Record types in variable declarations
    .replace(/:\s*Record<string,\s*NetworkConfig>/g, '')

    // Remove type imports
    .replace(/import\s+type\s+{[^}]*}\s+from\s+['"][^'"]*['"];?\s*/g, '')

    // Fix broken array declarations like `const allTransactions[] = [];`
    .replace(/const\s+(\w+)\[\]\s*=/g, 'const $1 =')
    .replace(/let\s+(\w+)\[\]\s*=/g, 'let $1 =')

    // Remove private/public/protected keywords
    .replace(/\bprivate\s+/g, '')
    .replace(/\bpublic\s+/g, '')
    .replace(/\bprotected\s+/g, '')

    // Fix union types in method signatures like `) | null {`
    .replace(/\)\s*\|\s*null\s*{/g, ') {')
    .replace(/\)\s*\|\s*\w+\s*{/g, ') {')

    // Fix return type annotations on methods
    .replace(/\)\s*:\s*[^{]+\s*{/g, ') {')
    .replace(/\)\s*:\s*[^{]+\s*\|[^{]+\s*{/g, ') {')

    // Fix broken template literals in console.error statements
    .replace(/console\.error\(`[^`]*\{[^`]*$/gm, function (match) {
        // If a console.error template literal is broken, close it properly
        return match + '`);';
    })

    // Clean up extra whitespace
    .replace(/\n\s*\n\s*\n/g, '\n\n');

// Ensure the dist directory exists
if (!fs.existsSync('dist')) {
    fs.mkdirSync('dist');
}

// Write the JavaScript version
fs.writeFileSync('dist/index.js', content);

console.log('Built JavaScript version for NPM'); 