import fs from 'fs';
import path from 'path';

// --- Configuration ---
const BASE_PATH = path.join(path.dirname(import.meta.url.substring(7)), './..');
const HEADER_FILE_PATH = path.join(BASE_PATH, './build/EPANET/include/epanet2_2.h'); // Path to your header
const TARGET_D_TS_PATH = path.join(BASE_PATH, './dist/index.d.ts'); // Where we want to write the .d.ts
const TEMP_D_TS_PATH = path.join(BASE_PATH, './build/index.d.ts'); // Temporary location in current directory
const POINTER_TYPE_NAME = 'Pointer'; // TS type alias for C pointers
const KNOWN_POINTER_TYPES = ['char *', 'const char *', 'int *', 'float *', 'double *', 'EN_Project', 'void *']; // Add known pointer types (EN_Project is likely a typedef for a pointer)
const MODULE_INTERFACE_NAME = 'EpanetModule';

// Ensure output directory exists
const outputDir = path.dirname(TEMP_D_TS_PATH);
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// --- Helper Functions ---

function mapCTypeToTsType(cType) {

    // Clean type for checks
    const cleanCType = cType.replace('const ', '').trim();

    // Simple check for function pointer syntax BEFORE other pointer checks
    if (cleanCType.includes('(*') && cleanCType.includes(')(')) {
         // Contains '(*' and likely argument parentheses ')(', assume function pointer
         return POINTER_TYPE_NAME;
    }

    // --- Existing Logic for other pointers/types ---
    if (KNOWN_POINTER_TYPES.includes(cleanCType) || cleanCType.endsWith('*')) {
        return POINTER_TYPE_NAME;
    }

    // Basic types
    switch (cleanCType) {
        case 'int':
        case 'long':
        case 'short':
        case 'float':
        case 'double':
            return 'number';
        case 'void':
            return 'void'; // Usually only for return types
        default:
            // Check if it might be an enum or struct pointer missed earlier
            if (cleanCType.startsWith('EN_') || cleanCType.startsWith('struct')) {
                 console.warn(` - Assuming pointer type for unknown C type: ${cleanCType}.`);
                 return POINTER_TYPE_NAME;
            }
            console.warn(` - Unhandled C type encountered: ${cleanCType}. Defaulting to 'any'.`);
            return 'any'; // Fallback for unknown types
    }
}

function parseParametersString(paramString) {
    if (!paramString.trim() || paramString.trim().toLowerCase() === 'void') {
        return []; // No parameters or explicitly void
    }
    const params = [];
    const correctlySplitParts = []; // Store correctly split parameter strings
    let level = 0; // Parenthesis nesting level
    let currentPart = '';


    for (let i = 0; i < paramString.length; i++) {
        const char = paramString[i];

        if (char === '(') {
            level++;
        } else if (char === ')') {
            level--;
        }

        // Only split by comma if we are at the top level (level 0)
        if (char === ',' && level === 0) {
            correctlySplitParts.push(currentPart.trim());
            currentPart = ''; // Reset for the next part
        } else {
            currentPart += char; // Append character to the current parameter part
        }
    }
    // Add the last part after the loop finishes
    if (currentPart.trim()) {
        correctlySplitParts.push(currentPart.trim());
    }


    // Now process each correctly split part
    for (const part of correctlySplitParts) {
        const trimmedPart = part; // Already trimmed by the logic above
        if (!trimmedPart) continue;

        let paramType = '';
        let paramName = '';

        // Check for function pointer syntax FIRST
        const starParenIndex = trimmedPart.indexOf('(*');
        // Ensure the closing paren is AFTER the opening one
        const closingParenIndex = starParenIndex !== -1 ? trimmedPart.indexOf(')', starParenIndex + 2) : -1;

        if (starParenIndex !== -1 && closingParenIndex !== -1) {
            // Likely a function pointer. Extract name between '(*' and ')'
            paramName = trimmedPart.substring(starParenIndex + 2, closingParenIndex).trim();
            paramType = trimmedPart; // Store the full complex signature as C type

            // Basic validation: check if there's another '(' after the name's ')' for arguments
            if (trimmedPart.indexOf('(', closingParenIndex) === -1) {
                 console.warn(` - Potential function pointer parse issue (missing args parenthesis?): ${trimmedPart}`);
            }
             console.log(`INFO: Detected function pointer: Name='${paramName}', FullType='${paramType}'`);

        } else {
            // Assume regular parameter: Use 'last space' logic
            const lastSpaceIndex = trimmedPart.lastIndexOf(' ');
            if (lastSpaceIndex === -1) {
                 // Check if it's just a type name (e.g. from an old K&R style definition - less likely here)
                 if (trimmedPart.length > 0){
                     // Assume the whole part is the type? Or maybe the name? Risky.
                     // Let's assume type for now, name is missing or implied?
                     paramType = trimmedPart;
                     paramName = `param${params.length + 1}`; // Generate a placeholder name
                     console.warn(` - Could not parse parameter part (no space?): '${trimmedPart}'. Assuming type only, using placeholder name '${paramName}'.`);
                 } else {
                    console.warn(` - Could not parse empty parameter part after split.`);
                    continue;
                 }
            } else {
                paramType = trimmedPart.substring(0, lastSpaceIndex).trim();
                paramName = trimmedPart.substring(lastSpaceIndex + 1).trim();

                // Clean potential '*' from name, ensure type has '*' if needed
                let typeNeedsPointer = false;
                 if (paramName.startsWith('*')) { typeNeedsPointer = true; paramName = paramName.substring(1).trim(); }
                 if(paramType.endsWith('*')){ typeNeedsPointer = true; }
                 // Check the original part between type and name for '*'
                 if (!typeNeedsPointer && trimmedPart.substring(lastSpaceIndex + 1).includes('*') && !paramName.includes('*')) {
                      typeNeedsPointer = true;
                 }

                 if (typeNeedsPointer && !paramType.endsWith('*')) { paramType += ' *'; }
                 // Clean name just in case '*' was attached
                 paramName = paramName.replace('*','');
            }
        }

        if (!paramName || !paramType) {
             console.warn(` - Failed to extract type or name for parameter part: ${trimmedPart}`);
             continue;
        }

        params.push({
            name: paramName,
            cType: paramType,
        });
    }
    return params;
}


function parseJSDoc(jsdocLines) {
    const data = {
        brief: '',
        params: {}, // Keyed by param name
        returnDesc: '',
    };
    let currentTag = null; // Tracks the last tag encountered (@brief, @param, @return)
    let currentParamName = null; // Tracks the name associated with the current @param tag

    for (const rawLine of jsdocLines) {
        let line = rawLine.trim();

        // Clean line start/end markers (*, /**, */)
        if (line.startsWith('/**')) { line = line.substring(3).trim(); }
        else if (line.startsWith('* ')) { line = line.substring(2); }
        else if (line.startsWith('*') && line.length > 1 && !line.startsWith('*/')) { line = line.substring(1).trim(); }
        else if (line === '*') { line = ''; }
        if (line.endsWith('*/')) { line = line.substring(0, line.length - 2).trim(); }

        let cleanLine = line;

        // Determine if this line starts a new tag
        let startsWithTag = false;
        if (cleanLine.startsWith('@brief')) {
            data.brief = cleanLine.substring(6).trim();
            currentTag = 'brief';
            currentParamName = null; // Reset param name tracking
            startsWithTag = true;
        } else if (cleanLine.startsWith('@param')) {
            currentTag = 'param';
            let remainingLine = cleanLine.substring(6).trim();
            let isOut = false;
            const directionMatch = remainingLine.match(/^\[(in|out|in,out)\]\s*/);
            if (directionMatch) {
                isOut = directionMatch[0].includes('out');
                remainingLine = remainingLine.substring(directionMatch[0].length);
            }

            const firstSpaceIndex = remainingLine.indexOf(' ');
            let namePart = '';
            let descriptionPart = '';
            if (firstSpaceIndex !== -1) {
                namePart = remainingLine.substring(0, firstSpaceIndex).trim();
                descriptionPart = remainingLine.substring(firstSpaceIndex + 1).trim();
            } else {
                namePart = remainingLine.trim(); // Assume only name if no space
                descriptionPart = '';
            }

            currentParamName = namePart; // Track the name for potential multi-line description

            if (currentParamName) {
                // Initialize param info if it doesn't exist, then set description
                if (!data.params[currentParamName]) {
                     data.params[currentParamName] = { description: '', isOut: isOut };
                }
                data.params[currentParamName].description = descriptionPart; // Assign/overwrite description from this line
                data.params[currentParamName].isOut = isOut; // Update isOut flag
            } else {
                console.warn(` - Malformed @param tag (no name): ${cleanLine}`);
                currentTag = null; // Reset tag state if param is invalid
            }
            startsWithTag = true;
        } else if (cleanLine.startsWith('@return')) {
            data.returnDesc = cleanLine.substring(7).trim();
            currentTag = 'return';
            currentParamName = null; // Reset param name tracking
            startsWithTag = true;
        }

        // If the line didn't start with a tag, AND we have an active tag context,
        // append the line content to the description of that active tag.
        if (!startsWithTag && currentTag && cleanLine) {
            const appendSeparator = '\n'; // Use newline for multi-line

            if (currentTag === 'brief') {
                data.brief += (data.brief ? appendSeparator : '') + cleanLine;
            } else if (currentTag === 'return') {
                 data.returnDesc += (data.returnDesc ? appendSeparator : '') + cleanLine;
            } else if (currentTag === 'param' && currentParamName && data.params[currentParamName]) {
                 // Append to the tracked parameter's description
                 data.params[currentParamName].description += (data.params[currentParamName].description ? appendSeparator : '') + cleanLine;
            }
        }
        // If the line didn't start with a tag AND we don't have an active tag context,
        // it might be the very first line(s) of the brief description.
        else if (!startsWithTag && !currentTag && cleanLine) {
             data.brief += (data.brief ? '\n' : '') + cleanLine;
             // Should we implicitly set currentTag = 'brief'? Maybe not needed.
        }
    } // End for loop

     // Final Trim Cleanup (should preserve newlines within descriptions)
    data.brief = data.brief.trim();
    data.returnDesc = data.returnDesc.trim();
    Object.values(data.params).forEach(p => {
        // Ensure description is a string, then trim.
        p.description = (p.description || '').trim();
    });

    // Add default return description if none was found
    if (!data.returnDesc) {
        data.returnDesc = "an error code.";
    }

    return data;
}
// --- Main Parsing Logic ---

console.log(`Reading header file: ${HEADER_FILE_PATH}`);
const headerContent = fs.readFileSync(HEADER_FILE_PATH, 'utf8');
const lines = headerContent.split(/\r?\n/); // Split by newline

const functions = [];
const failures = [];
let currentJSDocLines = [];
let inJSDoc = false;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Start of JSDoc
    if (line.startsWith('/**')) {
        // Check for previous unterminated JSDoc (shouldn't happen in clean files)
        if (inJSDoc) {
            failures.push(`Line ${i + 1}: New JSDoc started before previous one ended.`);
        }
        inJSDoc = true;
        currentJSDocLines = [line];
        // Handle single-line JSDoc immediately
        if (line.endsWith('*/') && line.length > 4) {
             inJSDoc = false;
        }
        continue; // Move to next line
    }

    // Inside JSDoc
    if (inJSDoc) {
        currentJSDocLines.push(line);
        // End of JSDoc
        if (line.endsWith('*/')) {
            inJSDoc = false;
        }
        continue; // Move to next line
    }

    // Outside JSDoc - looking for function signature after a completed JSDoc
    if (!inJSDoc && currentJSDocLines.length > 0 && line) {
        // We just finished a JSDoc block, and this is the first non-empty line after it.

        // Check for common non-function definitions FIRST before assuming it's a function
        const isTypeDef = line.startsWith('typedef');
        const isStructDef = line.startsWith('struct') && line.includes('{'); // Basic check
        const isEnumDef = line.startsWith('enum') && line.includes('{'); // Basic check
        const isDefine = line.startsWith('#define');

        if (isTypeDef || isStructDef || isEnumDef || isDefine) {
            // It's a known non-function definition following a JSDoc.
            // Log it as INFO, don't treat it as an error.
            // console.log(`INFO: Skipping non-function definition at line ${i + 1}: ${line}`);

            // IMPORTANT: Reset the JSDoc context and skip to the next line
            currentJSDocLines = [];
            continue; // Go to the next iteration of the 'for' loop
        }
        // ========= ADDITION END =========


        // If it wasn't a non-function definition handled above, NOW assume it might be a function signature.
        let signature = line;
        let signatureEndLine = i;
        // Read ahead to find the closing parenthesis and semicolon
        let parenLevel = (line.match(/\(/g) || []).length - (line.match(/\)/g) || []).length;
        let foundSemicolon = line.endsWith(';');


        while (!foundSemicolon && signatureEndLine + 1 < lines.length) {
            signatureEndLine++;
            const nextLine = lines[signatureEndLine].trim();

            // Stop reading ahead if we hit another JSDoc or preprocessor directive
            if (nextLine.startsWith('/**') || nextLine.startsWith('#')) {
                 failures.push(`Line ${i+1}-${signatureEndLine}: Signature potentially interrupted by comment/directive before semicolon.`);
                 foundSemicolon = false; // Mark as not found cleanly
                 break; // Stop reading ahead
            }

            signature += ' ' + nextLine; // Combine lines
            parenLevel += (nextLine.match(/\(/g) || []).length - (nextLine.match(/\)/g) || []).length;
            // Removed redundant check inside loop: if (parenLevel === 0 && nextLine.includes(')')) {}
             if (nextLine.endsWith(';')) { // Found the end
                foundSemicolon = true;
             }
             // Add safety break for runaway loops?
             if (signatureEndLine > i + 10) { // Arbitrary limit
                 failures.push(`Line ${i+1}-${signatureEndLine+1}: Potential runaway function signature parsing for: ${line}`);
                 foundSemicolon = true; // Force break
             }
        }

        if (!foundSemicolon) {
             failures.push(`Line ${i + 1}-${signatureEndLine+1}: Could not find terminating semicolon for potential function signature starting with: ${line}`);
             // Reset JSDoc context because we failed to parse this block
             currentJSDocLines = [];
             continue; // Skip to next line
        }

        // --- Try to Parse the Signature ---
        signature = signature.replace(/\s+/g, ' ').trim(); // Normalize spaces
        const parenOpenIndex = signature.indexOf('(');
        const parenCloseIndex = signature.lastIndexOf(')');
        const semicolonIndex = signature.lastIndexOf(';'); // Should exist if foundSemicolon is true


        // Adjusted failure condition check
        let parseFailed = false;
        if (parenOpenIndex === -1 || parenCloseIndex === -1 || parenCloseIndex < parenOpenIndex || semicolonIndex < parenCloseIndex ) {
            failures.push(`Line ${i + 1}-${signatureEndLine + 1}: Malformed signature structure (parentheses/semicolon): ${signature}`);
            parseFailed = true;
        } else {

            const beforeParams = signature.substring(0, parenOpenIndex).trim();
            const paramString = signature.substring(parenOpenIndex + 1, parenCloseIndex).trim();

            const partsBeforeParams = beforeParams.split(' ');
            // Handle potential macro between type and name like 'int DLLEXPORT funcName'
            let functionName = '';
            let returnType = '';
            if (partsBeforeParams.length > 0) {
                 functionName = partsBeforeParams[partsBeforeParams.length - 1];
                 // Assume everything before the last part is the return type (might include macros)
                 returnType = partsBeforeParams.slice(0, -1).join(' ');
                 // Simple macro handling (remove common ones if needed, adjust as necessary)
                 returnType = returnType.replace('DLLEXPORT', '').trim();
                 functionName = functionName.replace('DLLEXPORT', '').trim();
                 // If returnType is empty, maybe it was just 'int funcName'
                 if (!returnType && partsBeforeParams.length === 1) {
                     // This case is ambiguous, maybe the first part was the type?
                     // Let's assume the logic needs refinement if this happens often.
                     // For now, stick with the original split logic result.
                     // A more robust parser would handle types/macros better.
                 } else if (!returnType && partsBeforeParams.length > 1) {
                     // If type is still empty after removing last part, something is odd.
                     // Default to the full string before function name?
                     returnType = partsBeforeParams.slice(0, -1).join(' ');
                 } else if (!returnType) {
                      // Single word before '(', assume it's the return type
                      returnType = functionName;
                      functionName = ''; // This indicates a likely parse failure
                 }


            }


            if (!functionName || !returnType) {
                 failures.push(`Line ${i + 1}-${signatureEndLine + 1}: Could not extract function name or return type from: ${beforeParams}. Signature: ${signature}`);
                 parseFailed = true; // Mark as failed
            } else {
                 try {
                    const parsedParams = parseParametersString(paramString);
                    const jsdocData = parseJSDoc(currentJSDocLines);

                    // Augment params with JSDoc info
                    parsedParams.forEach(p => {
                        if (jsdocData.params[p.name]) {
                            p.description = jsdocData.params[p.name].description;
                            p.isOut = jsdocData.params[p.name].isOut;
                        }
                        p.tsType = mapCTypeToTsType(p.cType);
                    });

                    functions.push({
                        name: functionName,
                        returnCType: returnType,
                        returnTSType: mapCTypeToTsType(returnType),
                        params: parsedParams,
                        briefDescription: jsdocData.brief,
                        returnDescription: jsdocData.returnDesc,
                        rawSignature: signature,
                        jsdocContent: currentJSDocLines.join('\n') // Keep original JSDoc for reference if needed
                    });
                     // Successfully parsed, advance main loop index
                     i = signatureEndLine;

                 } catch (e) {
                     failures.push(`Line ${i + 1}-${signatureEndLine + 1}: Error processing params/JSDoc for ${functionName}: ${e.message}. Signature: ${signature}`);
                     parseFailed = true; // Mark as failed
                 }
            }
        }
        // Reset JSDoc context AFTER attempting to process the block following it
        currentJSDocLines = [];
    } else if (!inJSDoc && line && !line.startsWith('//') && !line.startsWith('#')) {
         // Non-empty, non-comment, non-directive line outside JSDoc and not following one.
         // Could be enum, struct, typedef, #define, etc.
         // Basic reporting for now, could add specific parsers later.
         //failures.push(`Line ${i + 1}: Unhandled line outside JSDoc: ${line}`);
    } else if (!inJSDoc) {
        // Empty line or comment line outside JSDoc, reset context just in case
         currentJSDocLines = [];
    }

}

// --- Generate TypeScript Output ---

console.log("\nGenerating TypeScript definitions...");

const tsFunctionDefs = functions.map(f => {
    const tsParams = f.params.map(p => `${p.name}: ${p.tsType}`).join(', ');
    let tsComment = `    /**\n`;
    if (f.briefDescription) tsComment += `     * ${f.briefDescription}\n`;
    if (f.params.length > 0) tsComment += `     *\n`;
    f.params.forEach(p => {
        const outFlag = p.isOut ? ' [out]' : '';
        tsComment += `     * @param ${p.name}${outFlag} ${p.description || ''}\n`;
    });
     if (f.returnDescription) tsComment += `     * @returns ${f.returnDescription}\n`;
     // Optional: Include original C signature for reference
     // tsComment += `     * C Signature: ${f.rawSignature}\n`;
    tsComment += `     */\n`;

    return `${tsComment}    _${f.name}(${tsParams}): ${f.returnTSType};`; // Add the Emscripten underscore prefix
}).join('\n\n');


// Add Emscripten boilerplate (customize as needed based on your build)
const boilerplateTop = `// Generated from ${path.basename(HEADER_FILE_PATH)} on ${new Date().toISOString()}
// WARNING: This file is auto-generated. Do not edit manually.

type ${POINTER_TYPE_NAME} = number;

// TODO: Define EmscriptenFS interface more completely if needed
interface EmscriptenFS {
    mkdir(path: string): void;
    writeFile(path: string, data: string | Uint8Array, opts?: { encoding?: 'utf8' | 'binary' }): void;
    readFile(path: string, opts?: { encoding: 'utf8' | 'binary' }): string | Uint8Array;
    // Add other FS methods you use
}

export interface ${MODULE_INTERFACE_NAME} {
    // --- Standard Emscripten Runtime ---
    _malloc(size: number): ${POINTER_TYPE_NAME};
    _free(ptr: ${POINTER_TYPE_NAME}): void;
    FS: EmscriptenFS;
    getValue(ptr: ${POINTER_TYPE_NAME}, type: 'i8' | 'i16' | 'i32' | 'i64' | 'float' | 'double' | '*' | string, noSafe?: boolean): number;
    lengthBytesUTF8(str: string): number;
    stringToUTF8(str: string, outPtr: ${POINTER_TYPE_NAME}, maxBytesToWrite: number): void;
    stringToNewUTF8(str: string): ${POINTER_TYPE_NAME};
    UTF8ToString(ptr: ${POINTER_TYPE_NAME}): string;
    HEAP8: Int8Array;
    HEAP32: Int32Array;
    HEAPF64: Float64Array;
    // Add any other EXPORTED_RUNTIME_METHODS here

    // --- Exported EPANET Functions ---
`;

const boilerplateBottom = `
}

// Default export factory function matching Emscripten MODULARIZE=1 and EXPORT_ES6=1
export default function EpanetModuleFactory(moduleOverrides?: object): Promise<${MODULE_INTERFACE_NAME}>;
`;

const finalTsContent = boilerplateTop + tsFunctionDefs + boilerplateBottom;

// First write to the current directory
fs.writeFileSync(TEMP_D_TS_PATH, finalTsContent);
console.log(`Successfully generated ${TEMP_D_TS_PATH} with ${functions.length} functions.`);

// Try to move to the target location
try {
    const targetDir = path.dirname(TARGET_D_TS_PATH);
    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }
    fs.renameSync(TEMP_D_TS_PATH, TARGET_D_TS_PATH);
    console.log(`Successfully moved file to ${TARGET_D_TS_PATH}`);
} catch (err) {
    console.warn(`Warning: Could not move file to ${TARGET_D_TS_PATH}. The file remains at ${TEMP_D_TS_PATH}`);
    console.warn(`Error details:`, err.message);
}

if (failures.length > 0) {
    console.warn(`\nEncountered ${failures.length} parsing issues:`);
    failures.forEach(fail => console.warn(` - ${fail}`));
    console.warn("\nPlease review the header file and the script's parsing logic for these sections.");
} else {
    console.log("No parsing issues detected.")
}