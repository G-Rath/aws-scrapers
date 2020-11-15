#!/usr/bin/env ts-node-transpile-only
/* eslint-disable node/no-sync */

import fs from 'fs';

const [, , pathToPolicy] = process.argv;

type StringOrArray = string | string[];

interface PolicyPrincipal {
  Service: string[];
}

// there will only ever be one condition in this map
type PolicyCondition = Record<string, string>;

interface PolicyStatement {
  Sid?: string;
  Effect: 'Allow' | 'Block';
  Action: StringOrArray;
  Principal?: PolicyPrincipal;
  Condition?: Record<string, PolicyCondition>;
  Resource: StringOrArray;
}

interface IAMPolicy {
  Version: string;
  Statement: PolicyStatement[];
}

const readPolicyJsonFromFile = (policyFilePath: string): IAMPolicy => {
  const contents = fs
    .readFileSync(policyFilePath, 'utf-8')
    .split('\n')
    .filter(line => !line.trim().startsWith('//'))
    .join('\n');

  return JSON.parse(contents) as IAMPolicy;
};

const printString = (str: string): string => `"${str.replace(/\$\{/gu, '&{')}"`;

const printArrayValue = (arr: string[], indentLevel = 1): string => {
  if (arr.length === 0) {
    return '[]';
  }

  const indent = ' '.repeat(2 * (indentLevel - 1));

  const items = arr.map((item, index) => {
    let value = printString(item);

    if (arr.length - 1 > index) {
      value += ',';
    }

    return `${indent}  ${value}`;
  });

  return ['[', ...items, `${indent}]`].join('\n');
};

const printValueAsArray = (value: StringOrArray): string =>
  printArrayValue(Array.isArray(value) ? value : [value]);

const printStatementBlock = (statement: PolicyStatement): string => {
  const attributes: string[] = [];

  if (statement.Sid) {
    attributes.push(`sid     = "${statement.Sid}"`);
  }

  attributes.push(
    `effect  = "${statement.Effect}"`,
    `actions = ${printValueAsArray(statement.Action)}`,
    ''
  );

  if (statement.Principal) {
    attributes.push(
      `
principals {
  identifiers = ${printArrayValue(statement.Principal.Service, 2)}
  type        = "Service"
}
      `.trim(),
      ''
    );
  }

  if (statement.Condition) {
    attributes.push(
      ...Object.entries(statement.Condition).flatMap(([test, condition]) => {
        const [[variable, values]] = Object.entries(condition);

        return [
          `
condition {
  test     = "${test}"
  variable = "${variable}"

  values = ${printArrayValue([values], 2)}
}
          `.trim(),
          ''
        ];
      })
    );
  }

  attributes.push(`resources = ${printValueAsArray(statement.Resource)}`);

  const innerText = attributes
    .map(attr =>
      attr === ''
        ? attr
        : attr
            .split('\n')
            .map(a => `    ${a}`)
            .join('\n')
    )
    .join('\n');

  return `
  statement {
${innerText}
  }
  `.trim();
};

const policy = readPolicyJsonFromFile(pathToPolicy);

const statements = policy.Statement.map(printStatementBlock);

const hcl = `
data "aws_iam_policy_document" "staff" {
  ${statements.join('\n\n  ')}
}
`.trim();

console.log(hcl);
