// ------------------------ recent utils ------------------------

const MAX_STORE = 20;
const CACHE_KEY_RECENT_FOLDER = 'CACHE_KEY_RECENT_FOLDER';
let recentFolders = JSON.parse(localStorage.getItem(CACHE_KEY_RECENT_FOLDER)) || [];

function getRecentFoldersIDs() {
  return recentFolders.map((i) => i.id);
}
function getRecentFolders() {
  return recentFolders;
}

function saveRecent(newItem) {
  // remove previous occurrences of this folder
  recentFolders = recentFolders.filter((i) => i.id !== newItem.id);
  recentFolders.unshift(newItem);
  if (recentFolders.length > MAX_STORE) {
    recentFolders = recentFolders.slice(0, MAX_STORE);
  }
  localStorage.setItem(CACHE_KEY_RECENT_FOLDER, JSON.stringify(recentFolders));
}

function getRecentFoldersOptions() {
  const optionDoms = [];
  const rencentOptionDoms = [];
  for (i = 0; i < folders.length; i++) {
    var text = folders[i].title;
    const id = folders[i].id;
    let path = folders[i].path;
    if (path && path.length) {
      path = path.replace(/Bookmarks\sBar\\?/gm, '');
    }
    if (path && path.length) text += ' (' + path + ')';
    if (getRecentFoldersIDs().includes(id)) {
      rencentOptionDoms.push({
        id,
        dom: '<option value=' + id + '>' + text + '</option>',
      });
      continue;
    }
    optionDoms.unshift('<option value=' + folders[i].id + '>' + text + '</option>');
  }
  return [optionDoms, rencentOptionDoms];
}

// ----------------------------- utils for building select2 dom tree ---------------

var r = new RegExp(/\s\(.*\)?$/);
function matcher(params, data) {
  if ($.trim(params) === '') {
    return data;
  }

  // TODO: Smarter regexp matching
  var matches = data.match(r);
  if (matches) data = data.substr(0, matches.index);
  return data.toLowerCase().indexOf(params.toLowerCase()) >= 0;
}

function findFolderNode({ query, enableExcludeRule, callback }) {
  chrome.bookmarks.getTree(function (bookmarkTreeNodes) {
    processArrayOfNodes({
      bookmarkNodes: bookmarkTreeNodes,
      query,
      parentNodes: [],
      enableExcludeRule,
    });
    if (folders.length === 0) {
      $('#notifications').show();
      $('#notifications').html('Folder not found');
    } else {
      callback();
    }
  });
}

function processArrayOfNodes({ bookmarkNodes, query, parentNodes, enableExcludeRule }) {
  for (var i = 0; i < bookmarkNodes.length; i++) {
    var tempParentNodes = parentNodes.slice();
    processNode({
      bookmarkNode: bookmarkNodes[i],
      query,
      parentNodes: tempParentNodes,
      enableExcludeRule,
    });
  }
}

function processNode({ bookmarkNode, query, parentNodes, enableExcludeRule }) {
  if (enableExcludeRule && matchExcludeRules(bookmarkNode.title)) {
    return;
  }

  if (!bookmarkNode.url) {
    if (
      query === '' ||
      (query.title && bookmarkNode.title === query.title) ||
      (query.id && bookmarkNode.id === query.id)
    ) {
      var folderPath = parentNodes
        .map(function (node) {
          return node.title;
        })
        .join('\\');
      var idPath = parentNodes.map((node) => node.id);

      folders.push({
        title: bookmarkNode.title,
        idPath,
        id: bookmarkNode.id,
        index: bookmarkNode.index,
        path: folderPath,
      });
    }
    if (bookmarkNode.children && bookmarkNode.children.length > 0) {
      if (bookmarkNode.title.length) parentNodes.push(bookmarkNode);
      processArrayOfNodes({
        bookmarkNodes: bookmarkNode.children,
        query,
        parentNodes,
        enableExcludeRule,
      });
    }
  }
}

// ------------------------------------------------ other utils  ----

var matchExcludeRules = (title) => {
  if (
    ['workspaces', 'aaa', 'old', '项目', 'Mobile Bookmarks', 'Other Bookmarks'].indexOf(title) > -1
  ) {
    return true;
  }
  // `.` 开头的是自动批量保存，排除
  if (title.startsWith('.')) {
    return true;
  }
  return false;
};

function isCheckedSaveAll() {
  return $('#saveAll')[0].checked === true;
}

function moveFoldertoFront(parentId) {
  const selectNode = folders.find((i) => i.id === parentId);
  // remove "BOOKMARKS_BAR" and push current folder
  const idPath = selectNode.idPath.slice(1).concat([parentId]);
  idPath.forEach((nid, depth) => {
    // BOOKMARKS_BAR 层级，folder移动到前面（但是要在OFFSET_INDEX后面）去
    if (depth === 0) {
      const index = folders.find((i) => i.id === nid).index;
      // when folder is already in front, should not move it
      if (index > OFFSET_INDEX) {
        chrome.bookmarks.move(nid, { index: OFFSET_INDEX }, function (e) {
          console.log(e);
        });
      }
    }
    // 其他层级，把folder移动到所属父级的前面去
    else {
      chrome.bookmarks.move(nid, { index: 0 }, function (e) {
        console.log(e);
      });
    }
  });
  const folderTItle = selectNode.title;
  saveRecent({ id: parentId, title: folderTItle });
}
