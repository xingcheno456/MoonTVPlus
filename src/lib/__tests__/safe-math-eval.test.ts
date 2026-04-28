import { safeEvalMathExpression, safeMathEval } from '@/lib/safe-math-eval';

describe('safeMathEval', () => {
  describe('基础算术', () => {
    it('应正确计算加法', () => {
      expect(safeMathEval('2 + 3')).toBe(5);
    });

    it('应正确计算减法', () => {
      expect(safeMathEval('10 - 4')).toBe(6);
    });

    it('应正确计算乘法', () => {
      expect(safeMathEval('3 * 7')).toBe(21);
    });

    it('应正确计算除法', () => {
      expect(safeMathEval('20 / 4')).toBe(5);
    });

    it('应正确计算取模', () => {
      expect(safeMathEval('17 % 5')).toBe(2);
    });
  });

  describe('运算优先级', () => {
    it('乘除优先于加减', () => {
      expect(safeMathEval('2 + 3 * 4')).toBe(14);
      expect(safeMathEval('10 - 6 / 2')).toBe(7);
    });

    it('括号改变优先级', () => {
      expect(safeMathEval('(2 + 3) * 4')).toBe(20);
      expect(safeMathEval('(10 - 2) / 4')).toBe(2);
    });

    it('嵌套括号', () => {
      expect(safeMathEval('((2 + 3) * (4 - 1))')).toBe(15);
    });
  });

  describe('负数与一元运算符', () => {
    it('应处理一元负号', () => {
      expect(safeMathEval('-5')).toBe(-5);
    });

    it('应处理表达式中的负数', () => {
      expect(safeMathEval('3 + -4')).toBe(-1);
    });

    it('应处理括号内的负号', () => {
      expect(safeMathEval('-(3 + 5)')).toBe(-8);
    });

    it('应处理连续负号（双负变正）', () => {
      expect(safeMathEval('--5')).toBe(5);
    });
  });

  describe('小数', () => {
    it('应支持小数运算', () => {
      expect(safeMathEval('1.5 + 2.5')).toBe(4);
    });

    it('应正确处理小数乘法', () => {
      const result = safeMathEval('0.1 * 3');
      expect(Math.abs(result - 0.3)).toBeLessThan(0.0001);
    });
  });

  describe('复杂表达式', () => {
    it('长链式运算', () => {
      expect(safeMathEval('1 + 2 + 3 + 4 + 5')).toBe(15);
    });

    it('混合运算', () => {
      expect(safeMathEval('(100 - 50) * 2 / 5 + 10')).toBe(30);
    });

    it('带空格的表达式', () => {
      expect(safeMathEval('  10   +   20  ')).toBe(30);
    });
  });

  describe('除零安全', () => {
    it('除零应返回 0 而非抛异常', () => {
      expect(safeMathEval('5 / 0')).toBe(0);
    });

    it('表达式中含除零', () => {
      expect(safeMathEval('10 + 5 / 0')).toBe(10);
    });
  });

  describe('错误输入', () => {
    it('空字符串应报错', () => {
      expect(() => safeMathEval('')).toThrow();
    });

    it('非法字符应报错', () => {
      expect(() => safeMathEval('alert(1)')).toThrow();
      expect(() => safeMathEval('2 ** 3')).toThrow();
      expect(() => safeMathEval('abc')).toThrow();
    });

    it('未闭合的括号应报错', () => {
      expect(() => safeMathEval('(1 + 2')).toThrow();
      expect(() => safeMathEval('1 + 2)')).toThrow();
    });

    it('多余字符应报错', () => {
      expect(() => safeMathEval('1 + 2 3')).toThrow();
    });
  });
});

describe('safeEvalMathExpression', () => {
  describe('变量替换', () => {
    it('应将上下文中的数字变量代入表达式', () => {
      expect(
        safeEvalMathExpression('a + b', { a: 10, b: 20 }),
      ).toBe('30');
    });

    it('应支持多变量替换', () => {
      expect(
        safeEvalMathExpression('x * y + z', { x: 2, y: 3, z: 4 }),
      ).toBe('10');
    });

    it('当表达式仅为变量名时应直接返回其值', () => {
      expect(
        safeEvalMathExpression('count', { count: 42, other: 99 }),
      ).toBe('42');
    });

    it('字符串变量替换后含引号应触发安全拒绝', () => {
      expect(() =>
        safeEvalMathExpression('name + x', { name: 'hello' }),
      ).toThrow();
    });
  });

  describe('安全防护', () => {
    it('包含不安全字符的表达式应抛出异常', () => {
      expect(() =>
        safeEvalMathExpression('__proto__', {}),
      ).toThrow(/不安全字符/);

      expect(() =>
        safeEvalMathExpression('constructor', {}),
      ).toThrow(/不安全字符/);
    });

    it('替换后的表达式仍含不安全字符应拒绝', () => {
      expect(() =>
        safeEvalMathExpression('a + b', { a: ';rm -rf', b: 1 }),
      ).toThrow(/不安全字符/);
    });

    it('拒绝 new Function 模式的字符串', () => {
      expect(() =>
        safeEvalMathExpression('new Function()', {}),
      ).toThrow(/不安全字符/);
    });

    it('拒绝 eval 模式的字符串', () => {
      expect(() =>
        safeEvalMathExpression('eval("x")', {}),
      ).toThrow(/不安全字符/);
    });
  });

  describe('边界情况', () => {
    it('空上下文时纯数字表达式正常工作', () => {
      expect(safeEvalMathExpression('1 + 2', {})).toBe('3');
    });

    it('上下文中变量名含特殊字符不应匹配', () => {
      expect(
        safeEvalMathExpression('a + b', { 'a.b': 100, a: 1, b: 2 }),
      ).toBe('3');
    });

    it('变量名是其他变量的子串时应按词边界匹配', () => {
      expect(
        safeEvalMathExpression('a + ab', { a: 1, ab: 10 }),
      ).toBe('11');
    });
  });
});
