function escapeHtml(text) {
  return typeof (text) === 'string' ? text
    .replace(/&(?!#[0-9]+;)/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;') : null;
}

function escapeMarkdown(text) {
  const parts = text.replace(/\\`/g, "&#096;").split("`");
  let result = "";
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 0) {
      result += parts[i]
        .replace(/\\\\/g, "&#092;")
        .replace(/\\\*/g, "&#042;")
        .replace(/\\_/g, "&#095;")
        .replace(/\\{/g, "&#123;").replace(/\\}/g, "&#125;")
        .replace(/\\\[/g, "&#091;").replace(/\\\]/g, "&#093;")
        .replace(/\\\(/g, "&#040;").replace(/\\\)/g, "&#041;")
        .replace(/\\#/g, "&#035;")
        .replace(/\\\+/g, "&#043;")
        .replace(/\\-/g, "&#045;")
        .replace(/\\\./g, "&#046;")
        .replace(/\\!/g, "&#033;")
        .replace(/\\\|/g, "&#124;")
        .replace(/<!--[\s\S]*?-->/g, '');
    } else { result += parts[i]; }
    if (i < parts.length - 1) { result += "`"; }
  }
  return result;
}

function replaceInline(text) {
  const parts = text.split("`");
  let result = "";
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 0) {
      result += parts[i]
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/!\[(.*?)\]\((.*?)\s*&quot;(.*?)&quot;\)/g, '<img src="$2" alt="$1" title="$3">')
        .replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1">')
        .replace(/(?<!!)\[(.*?)\]\((.*?)\s*&quot;(.*?)&quot;\)/g, '<a href="$2" title="$3">$1</a>')
        .replace(/(?<!!)\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>')
        .replace(/~~(.*?)~~/g, '<del>$1</del>')
        .replace(/^\*\*\*$/gm, '<hr>')
        .replace(/^---$/gm, '<hr>');
    } else { result += parts[i]; };
    if (i < parts.length - 1) { result += "`"; }
  }
  return result
    .replace(/\`(.*?)\`/g, '<code class="inline">$1</code>')
    .replace(/^\s*$/g, "<br>");
}

function tocParser(titleLevels, liTags) {
  const rootList = document.createElement('ul');
  let currentLists = [rootList];

  for (let i = 0; i < titleLevels.length; i++) {
    const titleLevel = titleLevels[i];
    const liTag = liTags[i];
    const newLi = document.createElement('li');
    newLi.innerHTML = liTag;

    while (currentLists.length > titleLevel) {
      currentLists.pop();
    }

    const parentList = currentLists[currentLists.length - 1];
    parentList.appendChild(newLi);

    if (titleLevel > 0) {
      const newList = document.createElement('ul');
      newLi.appendChild(newList);
      currentLists.push(newList);
    }
  }
  return rootList.outerHTML;
}

function markdownParser(markdown) {
  const lines = markdown.split('\n');
  let html = "", tochtml = [], tochirc = [];
  let isInCode = false, isInBigCode = false, isInTable = false, isInTodo = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code Block
    if (line.startsWith('````')) {
      if (!isInBigCode) {
        isInBigCode = true;
        html += '<pre><code>';
      } else {
        isInBigCode = false;
        html += '</code></pre>';
      }
      continue;
    } else if (isInBigCode) {
      html += `${escapeHtml(line)}\n`;
      continue;
    }

    if (line.startsWith('```') && !isInBigCode) {
      if (!isInCode) {
        isInCode = true;
        html += '<pre><code>';
      } else {
        isInCode = false;
        html += '</code></pre>';
      }
      continue;
    } else if (isInCode) {
      html += `${escapeHtml(line)}\n`;
      continue;
    }

    const rawLine = escapeMarkdown(line);

    // Blockquotes
    if (rawLine.startsWith('>')) {
      let quote = `${rawLine.slice(1).trim()}`;
      let j = i + 1;
      for (; j < lines.length; j++) {
        if (lines[j].startsWith('>')) {
          quote += `\n${lines[j].slice(1).trim()}`;
        } else {
          break;
        }
      }
      html += `<blockquote>${markdownParser(quote).post}</blockquote>`;
      i = j - 1;
      continue;
    }

    // Table
    if (rawLine.startsWith('|')) {
      const tabs = rawLine.split("|");
      if (!isInTable) {
        if (i + 2 < lines.length && lines[i + 1].startsWith('|') && lines[i + 2].startsWith('|')) {
          isInTable = true;
          html += "<table><thead><tr>";
          for (let j = 1; j < tabs.length - 1; j++) {
            html += `<th>${markdownParser(tabs[j].trim()).post}</th>`;
          }
          html += "</tr></thead><tbody>";
        }
        i++;
      } else {
        html += "<tr>";
        for (let j = 1; j < tabs.length - 1; j++) {
          html += `<td>${markdownParser(tabs[j].trim()).post}</td>`;
        }
        html += "</tr>";
        if (i == lines.length - 1) { html += "</tbody></table>"; }
      }
      continue;
    } else if (isInTable) {
      html += "</tbody></table>";
      isInTable = false;
    }

    // To-do List
    const match = rawLine.match(/^[-*] \[([ x])\]/);
    if (match) {
      if (!isInTodo) {
        isInTodo = true;
        html += '<ul class="todo">';
      }
      const taskText = replaceInline(escapeHtml(rawLine.slice(5).trim()));
      if (match[1] === 'x') {
        html += `<li><input type="checkbox" id="todo${i}" disabled checked><label for="todo${i}">${taskText}</label></li>`;
      } else {
        html += `<li><input type="checkbox" id="todo${i}" disabled><label for="todo${i}">${taskText}</label></li>`;
      }
      continue;
    } else {
      if (isInTodo) {
        html += '</ul>';
        isInTodo = false;
      }
    }

    // Title
    if (rawLine.startsWith('#')) {
      const headingLevel = rawLine.match(/^#+/)[0].length;
      const headingText = replaceInline(escapeHtml(rawLine.slice(headingLevel).trim()));
      html += `<h${headingLevel} id="${i}">${headingText}</h${headingLevel}>`;
      tochtml.push(`<a href="#${i}">${headingText}</a>`);
      tochirc.push(headingLevel);
      continue;
    }

    html += `<p>${replaceInline(escapeHtml(rawLine))}</p>`;
  }

  return { "post": html, "toc": `${tocParser(tochirc, tochtml)}` };
}

function getQueryVariable(variable) {
  const params = new URLSearchParams(window.location.search);
  const value = params.get(variable);
  return value !== null ? decodeURIComponent(value) : null;
}

const getFile = filename => fetch(filename).then(data => data.text());

const displayPost = postname => getFile("/wwwroot/" + postname).then(markdown => {
  const output = markdownParser(markdown);
  document.getElementById("tocview").innerHTML = output.toc;
  document.getElementById("mainview").innerHTML = output.post;
});

const displayIndex = () => getFile("/wwwroot/index.json").then(index => {
  let html = "<div class=\"index\">";
  for (const [key, value] of Object.entries(JSON.parse(index))) {
    html += `<a href="?id=${encodeURIComponent(value['location'])}">${key}</a>`;
  }
  document.getElementById("mainview").innerHTML = `${html}</div>`;
});

function displayTags() {

}

if (getQueryVariable("id") == null) {
  displayIndex();
} else {
  displayPost(getQueryVariable("id"));
}
