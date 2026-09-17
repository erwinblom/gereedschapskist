function ignoreGlobSource(pattern) {
 let source = '';
 for (let index = 0; index < pattern.length; index++) {
  const character = pattern[index];
  if (character === '*' && pattern[index + 1] === '*') {
   if (pattern[index + 2] === '/') {
    source += '(?:.*/)?';
    index += 2;
   } else {
    source += '.*';
    index += 1;
   }
  } else if (character === '*') {
   source += '[^/]*';
  } else if (character === '?') {
   source += '[^/]';
  } else {
   source += character.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
 }
 return source;
}

function parseIgnoreRules(text) {
 return String(text ?? '').split(/\r?\n/).flatMap(rawLine => {
  let line = rawLine.trim();
  if (!line || line.startsWith('#')) return [];
  const negated = line.startsWith('!');
  if (negated) line = line.slice(1);
  const directoryOnly = line.endsWith('/');
  line = line.replace(/^\//, '').replace(/\/$/, '');
  if (!line) return [];
  const basenameOnly = !line.includes('/');
  const prefix = basenameOnly ? '(?:^|/)' : '^';
  const suffix = directoryOnly ? '(?:/.*)?$' : '$';
  return [{ negated, directoryOnly, regex: new RegExp(prefix + ignoreGlobSource(line) + suffix) }];
 });
}

function pathIsIgnored(path, isDirectory, rules) {
 const cleanPath = String(path ?? '').replace(/^\.\//, '').replace(/\/$/, '');
 let ignored = false;
 for (const rule of rules) {
  if (rule.directoryOnly && !isDirectory) continue;
  if (rule.regex.test(cleanPath)) ignored = !rule.negated;
 }
 return ignored;
}

async function loadIgnoreRules(directoryHandle) {
 try {
  const ignoreHandle = await directoryHandle.getFileHandle('.ignore');
  return parseIgnoreRules(await (await ignoreHandle.getFile()).text());
 } catch (error) {
  if (error?.name !== 'NotFoundError') console.warn('Kon .ignore niet lezen:', error);
  return [];
 }
}
