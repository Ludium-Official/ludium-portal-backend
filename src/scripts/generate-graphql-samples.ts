/**
 * GraphQL Samples Generator
 *
 * This script generates .graphql sample files and variables.json files
 * for all V2 queries and mutations by introspecting the GraphQL schema.
 *
 * Usage: npm run generate:samples
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  type IntrospectionInputObjectType,
  type IntrospectionInputValue,
  type IntrospectionNamedTypeRef,
  type IntrospectionObjectType,
  type IntrospectionQuery,
  type IntrospectionType,
  type IntrospectionTypeRef,
  introspectionFromSchema,
  printSchema,
} from 'graphql';
import { schema } from '../graphql/types';

interface Operation {
  name: string;
  type: 'query' | 'mutation' | 'subscription';
  description?: string;
  args: Array<{ name: string; type: string; required: boolean }>;
  returnType: string;
}

/**
 * Check if type is IntrospectionObjectType
 */
function isObjectType(type: IntrospectionType | null | undefined): type is IntrospectionObjectType {
  return type?.kind === 'OBJECT';
}

/**
 * Check if type is IntrospectionInputObjectType
 */
function isInputObjectType(
  type: IntrospectionType | null | undefined,
): type is IntrospectionInputObjectType {
  return type?.kind === 'INPUT_OBJECT';
}

/**
 * Check if type reference is a named type with a name
 */
function hasName(type: IntrospectionTypeRef): type is IntrospectionNamedTypeRef {
  return 'name' in type && type.name !== null && type.name !== undefined;
}

/**
 * Unwrap GraphQL type (NonNull, List, etc.)
 */
function unwrapType(type: IntrospectionTypeRef): IntrospectionTypeRef {
  if (type.kind === 'NON_NULL' || type.kind === 'LIST') {
    return unwrapType(type.ofType);
  }
  return type;
}

/**
 * Get all fields from a type recursively with proper nesting
 * For frontend use: id fields are optional as they're auto-generated
 */
function getFieldsWithNesting(
  introspection: IntrospectionQuery,
  typeName: string,
  depth = 0,
  maxDepth = 2,
  indent = '    ',
  includeId = false, // Frontend doesn't always need id (auto-generated)
): string {
  if (depth > maxDepth) return '';

  const type = introspection.__schema.types.find((t) => t.name === typeName);
  if (!type || !isObjectType(type) || !type.fields) {
    return includeId ? `${indent}id\n` : '';
  }

  let result = '';
  const nestedIndent = `${indent}  `;
  const usedFields = new Set<string>(); // Track fields to avoid duplicates

  for (const field of type.fields) {
    // Skip duplicate fields
    if (usedFields.has(field.name)) continue;
    usedFields.add(field.name);

    const fieldType = unwrapType(field.type);
    const fieldTypeName = hasName(fieldType) ? fieldType.name : null;

    // Check if it's a scalar or simple type
    const isScalar = fieldType.kind === 'SCALAR' || fieldType.kind === 'ENUM';
    const isSimpleScalar =
      isScalar && fieldTypeName
        ? ['ID', 'String', 'Int', 'Float', 'Boolean', 'DateTime', 'Date'].includes(fieldTypeName)
        : false;

    // If it's an object type (not scalar), include nested fields
    if (fieldType.kind === 'OBJECT' && hasName(fieldType) && !isSimpleScalar) {
      // Check if it's a known object type
      const nestedType = introspection.__schema.types.find((t) => t.name === fieldTypeName);
      if (nestedType && isObjectType(nestedType) && nestedType.fields && depth < maxDepth) {
        result += `${indent}${field.name} {\n`;
        // Get common fields from nested type (limit to avoid too deep)
        // Exclude id for nested objects (auto-generated, not needed for frontend)
        const commonFields = new Set<string>();
        for (const nestedField of nestedType.fields.slice(0, 10)) {
          // Skip id and createdAt/updatedAt for nested objects (auto-generated)
          if (
            nestedField.name === 'id' ||
            nestedField.name === 'createdAt' ||
            nestedField.name === 'updatedAt'
          ) {
            continue;
          }
          const nestedFieldType = unwrapType(nestedField.type);
          if (
            nestedFieldType.kind === 'SCALAR' ||
            nestedFieldType.kind === 'ENUM' ||
            (nestedFieldType.kind === 'OBJECT' && depth >= maxDepth - 1)
          ) {
            commonFields.add(nestedField.name);
          }
        }
        const fieldsArray = Array.from(commonFields);
        if (fieldsArray.length > 0) {
          result += fieldsArray.map((f) => `${nestedIndent}${f}`).join('\n');
          result += '\n';
        }
        result += `${indent}}\n`;
      } else {
        // Just include the field name if we can't get nested fields
        result += `${indent}${field.name}\n`;
      }
    } else {
      // Simple scalar field - skip id for nested objects
      if (depth > 0 && field.name === 'id') {
        continue;
      }
      result += `${indent}${field.name}\n`;
    }
  }

  return result;
}

/**
 * Generate GraphQL operation query/mutation
 */
function generateGraphQLOperation(operation: Operation, introspection: IntrospectionQuery): string {
  const { name, type, args } = operation;
  const operationType = type === 'query' ? 'query' : 'mutation';
  const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1);

  // Build arguments
  let argsStr = '';
  const variables: string[] = [];
  const argsMap: Record<string, string> = {};

  for (const arg of args) {
    // printType already includes ! for required types, so check if it's already there
    let varType = arg.type;
    if (arg.required && !varType.endsWith('!')) {
      varType = `${varType}!`;
    }
    variables.push(`$${arg.name}: ${varType}`);
    argsMap[arg.name] = arg.name;
  }

  if (variables.length > 0) {
    argsStr = `(${variables.join(', ')})`;
  }

  // Build operation name
  let operationName = capitalizedName;
  if (!operationName.endsWith('V2')) {
    operationName += 'V2';
  }

  // Get return type fields
  const rootType = introspection.__schema.types.find(
    (t) => t.name === 'Mutation' || t.name === 'Query',
  );

  let returnTypeName = 'ID';
  if (isObjectType(rootType) && rootType.fields) {
    const field = rootType.fields.find((f) => f.name === name);
    if (field) {
      const unwrappedType = unwrapType(field.type);
      if (unwrappedType.kind === 'OBJECT' && hasName(unwrappedType)) {
        returnTypeName = unwrappedType.name;
      } else if (unwrappedType.kind === 'NON_NULL' || unwrappedType.kind === 'LIST') {
        const furtherUnwrapped = unwrapType(unwrappedType.ofType);
        if (hasName(furtherUnwrapped)) {
          returnTypeName = furtherUnwrapped.name;
        }
      }
    }
  }

  // Build field selection with proper nesting
  // For mutations: include id only if needed for subsequent operations
  // For queries: id is optional (auto-generated)
  let fieldSelection = '';
  if (returnTypeName.includes('Payload') || returnTypeName.includes('Paginated')) {
    // For complex types, include nested fields recursively
    // Exclude id from nested objects (auto-generated)
    fieldSelection = getFieldsWithNesting(introspection, returnTypeName, 0, 2, '   ', false);
  } else {
    // For simple types, get fields and format
    // Exclude id from top level (auto-generated, frontend doesn't need it)
    const type = introspection.__schema.types.find((t) => t.name === returnTypeName);
    if (type && isObjectType(type) && type.fields) {
      const commonFields = type.fields
        .filter((f) => f.name !== 'id' && f.name !== 'createdAt' && f.name !== 'updatedAt')
        .slice(0, 8)
        .map((f) => f.name);
      if (commonFields.length > 0) {
        fieldSelection = `    ${commonFields.join('\n    ')}\n`;
      } else {
        // Fallback: include some basic fields if available
        const fallbackFields = type.fields
          .filter((f) => f.name !== 'id')
          .slice(0, 5)
          .map((f) => f.name);
        fieldSelection = `    ${fallbackFields.join('\n    ')}\n`;
      }
    } else {
      // No fields available
      fieldSelection = '';
    }
  }

  // Build operation call arguments
  const callArgs = Object.keys(argsMap)
    .map((key) => `${key}: $${key}`)
    .join(', ');

  let template = `${operationType} ${operationName}${argsStr} {\n`;
  template += `  ${name}(${callArgs}) {\n`;
  template += fieldSelection;
  template += '  }\n}\n';

  return template;
}

/**
 * Generate example variables based on input types
 */
function generateVariables(
  operation: Operation,
  introspection: IntrospectionQuery,
): Record<string, unknown> {
  const variables: Record<string, unknown> = {};

  for (const arg of operation.args) {
    if (arg.type.includes('Input')) {
      const inputTypeName = arg.type.replace('!', '').replace('[', '').replace(']', '');
      const inputType = introspection.__schema.types.find((t) => t.name === inputTypeName);

      if (inputType && isInputObjectType(inputType) && inputType.inputFields) {
        const inputObj: Record<string, unknown> = {};

        for (const field of inputType.inputFields) {
          const fieldType = unwrapType(field.type);
          const isRequired = field.type.kind === 'NON_NULL';

          // Generate example value based on type
          if (fieldType.kind === 'SCALAR' && hasName(fieldType)) {
            if (fieldType.name === 'String') {
              if (field.name.includes('email')) {
                inputObj[field.name] = 'example@example.com';
              } else if (field.name.includes('address') || field.name.includes('tx')) {
                inputObj[field.name] = `0x${'0'.repeat(64)}`;
              } else if (field.name.includes('hash')) {
                inputObj[field.name] = `0x${'a'.repeat(64)}`;
              } else {
                inputObj[field.name] = `Example ${field.name}`;
              }
            } else if (fieldType.name === 'Int') {
              inputObj[field.name] = 1;
            } else if (fieldType.name === 'Float') {
              inputObj[field.name] = 1000.0;
            } else if (fieldType.name === 'Boolean') {
              inputObj[field.name] = true;
            } else if (fieldType.name === 'DateTime' || fieldType.name === 'Date') {
              const futureDate = new Date();
              futureDate.setMonth(futureDate.getMonth() + 1);
              inputObj[field.name] = futureDate.toISOString();
            }
          } else if (fieldType.kind === 'ENUM' && hasName(fieldType)) {
            // Get first enum value
            const enumType = introspection.__schema.types.find((t) => t.name === fieldType.name);
            if (enumType && enumType.kind === 'ENUM' && enumType.enumValues.length > 0) {
              inputObj[field.name] = enumType.enumValues[0].name;
            }
          } else if (fieldType.kind === 'INPUT_OBJECT' && hasName(fieldType)) {
            // Recursively build nested input
            const nestedInput = introspection.__schema.types.find((t) => t.name === fieldType.name);
            if (nestedInput && isInputObjectType(nestedInput) && nestedInput.inputFields) {
              const nested: Record<string, unknown> = {};
              for (const nestedField of nestedInput.inputFields.slice(0, 5)) {
                // Limit nested fields
                const nestedFieldType = unwrapType(nestedField.type);
                if (nestedFieldType.kind === 'SCALAR' && hasName(nestedFieldType)) {
                  if (nestedFieldType.name === 'String') {
                    nested[nestedField.name] = `Example ${nestedField.name}`;
                  } else if (nestedFieldType.name === 'Int') {
                    nested[nestedField.name] = 1;
                  }
                }
              }
              if (Object.keys(nested).length > 0) {
                inputObj[field.name] = nested;
              }
            }
          } else if (fieldType.kind === 'LIST') {
            const listItemType = unwrapType(fieldType.ofType);
            if (listItemType.kind === 'SCALAR' && hasName(listItemType)) {
              if (listItemType.name === 'String') {
                inputObj[field.name] = ['Example Item 1', 'Example Item 2'];
              } else if (listItemType.name === 'Int') {
                inputObj[field.name] = [1, 2];
              }
            }
          }

          // Only include if it's required or we have a value
          if (!isRequired && !inputObj[field.name]) {
            // Skip optional fields without values for cleaner examples
          }
        }

        if (Object.keys(inputObj).length > 0) {
          variables[arg.name] = inputObj;
        } else {
          variables[arg.name] = {};
        }
      } else if (arg.type.includes('ID')) {
        variables[arg.name] = '1';
      } else if (arg.type.includes('Int')) {
        variables[arg.name] = 1;
      } else if (arg.type.includes('String')) {
        variables[arg.name] = 'example';
      }
    } else if (arg.type.includes('ID')) {
      variables[arg.name] = '1';
    } else if (arg.type.includes('Int')) {
      variables[arg.name] = 1;
    } else if (arg.type.includes('String')) {
      variables[arg.name] = 'example';
    }
  }

  return variables;
}

/**
 * Convert camelCase/PascalCase to kebab-case
 * Example: CreateProgramWithOnchainV2 -> create-program-with-onchain-v2
 */
function camelToKebab(str: string): string {
  // Handle V2 suffix first
  const hasV2 = str.endsWith('V2');
  const base = hasV2 ? str.slice(0, -2) : str;

  // Convert PascalCase/camelCase to kebab-case
  // Step 1: Insert hyphen before capital letters (except first)
  // Step 2: Handle consecutive capitals (e.g., "V2API" -> "v2-api")
  const result = base
    .replace(/([a-z\d])([A-Z])/g, '$1-$2') // Insert hyphen before capital letters after lowercase
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2') // Handle consecutive capitals
    .toLowerCase();

  // Add V2 suffix with hyphen
  return hasV2 ? `${result}-v2` : result;
}

/**
 * Print GraphQL type as string
 */
function printType(type: IntrospectionTypeRef): string {
  if (type.kind === 'NON_NULL') {
    return `${printType(type.ofType)}!`;
  }
  if (type.kind === 'LIST') {
    return `[${printType(type.ofType)}]`;
  }
  return hasName(type) ? type.name : 'Unknown';
}

/**
 * Generate sample files for all operations
 */
async function generateSamples() {
  try {
    const introspection = introspectionFromSchema(schema);

    // Extract operations
    const queryType = introspection.__schema.types.find((t) => t.name === 'Query');
    const mutationType = introspection.__schema.types.find((t) => t.name === 'Mutation');

    const operations: Operation[] = [];

    // Extract queries
    if (queryType && isObjectType(queryType) && queryType.fields) {
      for (const field of queryType.fields) {
        if (field.name.includes('V2') || field.name.toLowerCase().includes('article')) {
          const args: Array<{ name: string; type: string; required: boolean }> = field.args.map(
            (arg: IntrospectionInputValue) => ({
              name: arg.name,
              type: printType(arg.type),
              required: arg.type.kind === 'NON_NULL',
            }),
          );

          operations.push({
            name: field.name,
            type: 'query',
            description: field.description || undefined,
            args,
            returnType: printType(field.type),
          });
        }
      }
    }

    // Extract mutations
    if (mutationType && isObjectType(mutationType) && mutationType.fields) {
      for (const field of mutationType.fields) {
        if (field.name.includes('V2') || field.name.toLowerCase().includes('article')) {
          const args: Array<{ name: string; type: string; required: boolean }> = field.args.map(
            (arg: IntrospectionInputValue) => ({
              name: arg.name,
              type: printType(arg.type),
              required: arg.type.kind === 'NON_NULL',
            }),
          );

          operations.push({
            name: field.name,
            type: 'mutation',
            description: field.description || undefined,
            args,
            returnType: printType(field.type),
          });
        }
      }
    }

    // Group operations by domain
    const groupedOperations = new Map<string, Operation[]>();

    for (const op of operations) {
      let domain = 'common';

      // Extract domain from operation name
      const name = op.name.toLowerCase();
      if (name.includes('program')) {
        domain = 'program';
      } else if (name.includes('application')) {
        domain = 'application';
      } else if (name.includes('user')) {
        domain = 'user';
      } else if (name.includes('milestone')) {
        domain = 'milestone';
      } else if (name.includes('token')) {
        domain = 'token';
      } else if (name.includes('network')) {
        domain = 'network';
      } else if (name.includes('onchain')) {
        domain = 'onchain';
      } else if (name.includes('smartcontract')) {
        domain = 'smart-contract';
      } else if (name.includes('dashboard')) {
        domain = 'dashboard';
      } else if (name.includes('portfolio')) {
        domain = 'portfolio';
      } else if (name.includes('article')) {
        domain = 'article';
      }

      if (!groupedOperations.has(domain)) {
        groupedOperations.set(domain, []);
      }
      const domainOps = groupedOperations.get(domain);
      if (domainOps) {
        domainOps.push(op);
      }
    }

    // Generate files
    const samplesDir = join(process.cwd(), 'samples', 'v2');
    let totalGenerated = 0;

    for (const [domain, ops] of groupedOperations.entries()) {
      const domainDir = join(samplesDir, domain);
      await mkdir(domainDir, { recursive: true });

      for (const op of ops) {
        // Generate .graphql file
        const fileNameBase = camelToKebab(op.name);
        const graphqlFileName = `${fileNameBase}.graphql`;
        const graphqlFilePath = join(domainDir, graphqlFileName);

        let graphqlContent = '';
        if (op.description) {
          graphqlContent += `# ${op.description}\n\n`;
        }
        graphqlContent += generateGraphQLOperation(op, introspection);

        await writeFile(graphqlFilePath, graphqlContent, 'utf-8');
        console.log(`✅ Generated: ${graphqlFilePath}`);

        // Generate variables.json file if operation has input arguments
        if (op.args.length > 0) {
          const variablesFileName = `${fileNameBase}-variables.json`;
          const variablesFilePath = join(domainDir, variablesFileName);

          const variables = generateVariables(op, introspection);
          const variablesContent = `${JSON.stringify(variables, null, 2)}\n`;

          await writeFile(variablesFilePath, variablesContent, 'utf-8');
          console.log(`✅ Generated: ${variablesFilePath}`);
          totalGenerated += 2;
        } else {
          totalGenerated += 1;
        }
      }
    }

    // Generate schema.graphql file
    const schemaFilePath = join(process.cwd(), 'src', 'graphql', 'schema.graphql');
    const schemaString = printSchema(schema);
    await writeFile(schemaFilePath, schemaString, 'utf-8');
    console.log(`✅ Generated: ${schemaFilePath}`);

    console.log(
      `\n✨ Generated ${totalGenerated} sample files for ${operations.length} operations`,
    );
    console.log('✨ Generated schema.graphql file');
    console.log(`📁 Sample files are in: ${samplesDir}`);
    console.log(`📁 Schema file is in: ${schemaFilePath}`);
  } catch (error) {
    console.error('❌ Error generating samples:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

generateSamples();
