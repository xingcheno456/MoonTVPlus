const SAFE_CHARS = /^[\d\s+\-*/().]+$/;

export function safeEvalMathExpression(
  expr: string,
  context: Record<string, any>,
): string {
  const trimmed = expr.trim();

  if (Object.prototype.hasOwnProperty.call(context, trimmed)) {
    return String(context[trimmed]);
  }

  let substituted = trimmed;
  for (const [key, val] of Object.entries(context)) {
    const regex = new RegExp(`\\b${key}\\b`, 'g');
    const replacement =
      typeof val === 'number'
        ? String(val)
        : `"${String(val).replace(/"/g, '\\"')}"`;
    substituted = substituted.replace(regex, replacement);
  }

  if (!SAFE_CHARS.test(substituted)) {
    throw new Error(`表达式包含不安全字符: ${substituted}`);
  }

  try {
    const result = safeMathEval(substituted);
    return String(result);
  } catch (err) {
    throw new Error(`安全表达式求值失败: ${trimmed} (${(err as Error).message})`);
  }
}

export function safeMathEval(expr: string): number {
  const tokens = tokenizeMath(expr);
  let pos = { index: 0 };
  const result = parseExpr(tokens, pos);
  if (pos.index < tokens.length) {
    throw new Error(`Unexpected token at position ${pos.index}`);
  }
  return result;
}

function tokenizeMath(expr: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (/[0-9.]/.test(ch)) {
      let num = '';
      while (i < expr.length && /[0-9.]/.test(expr[i])) {
        num += expr[i++];
      }
      tokens.push(num);
      continue;
    }
    if (/[+\-*/()%]/.test(ch)) {
      tokens.push(ch);
      i++;
      continue;
    }
    throw new Error(`Unexpected character: ${ch}`);
  }
  return tokens;
}

function parseExpr(tokens: string[], pos: { index: number }): number {
  let left = parseTerm(tokens, pos);
  while (
    pos.index < tokens.length &&
    (tokens[pos.index] === '+' || tokens[pos.index] === '-')
  ) {
    const op = tokens[pos.index++];
    const right = parseTerm(tokens, pos);
    left = op === '+' ? left + right : left - right;
  }
  return left;
}

function parseTerm(tokens: string[], pos: { index: number }): number {
  let left = parseFactor(tokens, pos);
  while (
    pos.index < tokens.length &&
    (tokens[pos.index] === '*' ||
      tokens[pos.index] === '/' ||
      tokens[pos.index] === '%')
  ) {
    const op = tokens[pos.index++];
    const right = parseFactor(tokens, pos);
    if (op === '*') left = left * right;
    else if (op === '/') {
      if (right === 0) throw new Error('Division by zero');
      left = left / right;
    }
    else left = left % right;
  }
  return left;
}

function parseFactor(tokens: string[], pos: { index: number }): number {
  if (pos.index >= tokens.length) throw new Error('Unexpected end of expression');
  const token = tokens[pos.index++];
  if (token === '(') {
    const result = parseExpr(tokens, pos);
    if (pos.index >= tokens.length || tokens[pos.index] !== ')') {
      throw new Error('Missing closing parenthesis');
    }
    pos.index++;
    return result;
  }
  if (token === '-' || token === '+') {
    const factor = parseFactor(tokens, pos);
    return token === '-' ? -factor : factor;
  }
  const num = Number(token);
  if (isNaN(num)) throw new Error(`Invalid number: ${token}`);
  return num;
}
