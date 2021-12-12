var folders;
const BOOKMARKS_BAR = '1';
const OFFSET_INDEX = 3;

$(function () {
  folders = new Array();
  buildSelectOptions();

  const saveTab = (close) => {
    const parentId = $('#select-box').val();
    moveFoldertoFront(parentId);

    const title = $('#inputTitle').val();

    chrome.bookmarks.create({
      index: 0,
      parentId,
      title,
      url: currentTab.url,
    });
    close();
  };

  var currentTab;
  chrome.tabs.getSelected(null, function (tab) {
    currentTab = tab;
    $('#inputTitle').val(currentTab.title);
  });

  $('body').on('keyup', '.select2-input', function (event) {
    if (event.which === 13) {
      var inputStr = $('.select2-input').val();
      if (inputStr.indexOf('>') !== -1) {
        var elems = inputStr.split('>');

        //new folder on homeFolder level
        if (elems[0] === '') {
          var newFolderName = elems[1].trim();

          //create new folder
          chrome.bookmarks.create({
            // the index of folder 'team'
            index: OFFSET_INDEX,
            parentId: BOOKMARKS_BAR,
            title: newFolderName,
          });

          //save bookmark in new folder
          folders = new Array();
          findFolderNode({ title: newFolderName }, function () {
            saveRecent({ id: folders[0].id, title: newFolderName });
            chrome.bookmarks.create({
              parentId: folders[0].id,
              title: $('#inputTitle').val(),
              url: currentTab.url,
            });
            window.close();
          });
        } else {
          //new folder within other user defined folder

          var parentFolderName = elems[0].trim();
          var newFolderName = elems[1].trim();

          //create new folder
          folders = new Array();
          findFolderNode({ title: parentFolderName }, function () {
            chrome.bookmarks.create({
              index: 0,
              parentId: folders[0].id,
              title: newFolderName,
            });

            //save bookmark in new folder
            folders = new Array();
            findFolderNode({ title: newFolderName }, function () {
              saveRecent({ id: folders[0].id, title: newFolderName });
              chrome.bookmarks.create({
                index: 0,
                parentId: folders[0].id,
                title: $('#inputTitle').val(),
                url: currentTab.url,
              });
              window.close();
            });
          });
        }
      }
    }
  });

  setTimeout(function () {
    $('.select2').select2('open');
  }, 100);

  $('.select2').change(function () {
    saveTab(() => window.close());
  });

  $('#submitBtn').click(function (e) {
    if ($('#select-box').val() === '') {
      e.preventDefault();
      $('#notifications').show();
      $('#notifications').html('Choose a folder');
    } else {
      saveTab(() => window.close());
    }
  });
  $('#tmpSave').click(function (e) {
    // `.` 开头用来作为类别标识
    var newFolderName = '.' + $('#inputTitle').val().trim();

    //create new folder
    chrome.bookmarks.create({
      // the index of folder 'team'
      index: OFFSET_INDEX,
      parentId: BOOKMARKS_BAR,
      title: newFolderName,
    });

    //save bookmark in new folder
    folders = new Array();
    findFolderNode({ title: newFolderName }, function () {
      saveRecent({ id: folders[0].id, title: newFolderName });
      chrome.tabs.query({ currentWindow: true }, function (activeTabsInCurrentWindow) {
        activeTabsInCurrentWindow.forEach((item) => {
          chrome.bookmarks.create({
            parentId: folders[0].id,
            title: item.title,
            url: item.url,
          });
        });
        close();
      });
    });
  });
});

function buildSelectOptions() {
  var query = '';
  chrome.bookmarks.getTree(function (bookmarkTreeNodes) {
    processArrayOfNodes(bookmarkTreeNodes, query, []);
    const [optionDoms, rencentOptionDoms] = getRecentFoldersOptions();
    const recentFolders = getRecentFolders();
    for (i = recentFolders.length - 1; i >= 0; i--) {
      const id = recentFolders[i].id;
      const item = rencentOptionDoms.find((i) => i.id === id);
      item && optionDoms.unshift(item.dom);
    }
    optionDoms.unshift(`<option value="" selected>选择...</option>`);
    $('#select-box').html(optionDoms.join(''));
    $('.select2').select2({ matcher: matcher });
  });
}
