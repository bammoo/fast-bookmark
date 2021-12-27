var folders;
const BOOKMARKS_BAR_ID = '1';
const OFFSET_INDEX = 3;
const defaultOption = '选择...';

$(function () {
  folders = new Array();
  buildSelectOptions();
  setTimeout(function () {
    $('.select2').select2('open');
  }, 100);

  var currentTab;
  chrome.tabs.getSelected(null, function (tab) {
    currentTab = tab;
    $('#inputTitle').val(currentTab.title);
  });

  let saveBaseFolderId;
  $('body').on('keyup', '.select2-input', function (event) {
    // right arrow
    if (event.which === 39) {
      const hoverd = $('.select2-highlighted').text();
      if (hoverd && hoverd !== defaultOption) {
        try {
          const id = $('.select2-highlighted').data('select2Data').element[0].value;
          saveBaseFolderId = id;
          const item = folders.find((i) => i.id === id);
          console.log(`xjf: item`, item);
          $('#parent-folder').val(`${item.title}`);
          $('.select2-input').val('>');
        } catch (error) {
          showError('parent folder parse error');
        }
      }
    }
    // enter
    else if (event.which === 13) {
      var inputStr = event.target.value;
      if (inputStr.indexOf('>') !== 0) {
        showError('need starts with `>`');
        return;
      }

      // TODO: 这里的逻辑应该改为 `split('>')` 后递归创建新的子目录
      // var elems = inputStr.split('>');
      // var parentFolderName = elems[0].trim();
      // var newFolderName = elems[1].trim();
      var newFolderName = inputStr.slice(1);

      //create new folder
      chrome.bookmarks.create(
        {
          // the index of folder 'team'
          index: saveBaseFolderId ? 0 : OFFSET_INDEX,
          parentId: saveBaseFolderId || BOOKMARKS_BAR_ID,
          title: newFolderName,
        },
        (result) => {
          if (saveBaseFolderId) {
            moveFoldertoFront(saveBaseFolderId);
          }
          console.log(`xjf: saved to`, newFolderName);
          //save bookmark in new folder
          const newId = result.id;
          saveRecent({ id: newId, title: newFolderName });
          chrome.bookmarks.create({
            index: 0,
            parentId: newId,
            title: $('#inputTitle').val(),
            url: currentTab.url,
          });
          window.close();
        },
      );
    }
  });

  $('.select2').change(function () {
    const parentId = $('select#select-box').val();
    moveFoldertoFront(parentId);

    const title = $('#inputTitle').val();

    chrome.bookmarks.create({
      index: 0,
      parentId,
      title,
      url: currentTab.url,
    });
    window.close();
  });
});

function buildSelectOptions() {
  var query = '';
  chrome.bookmarks.getTree(function (bookmarkTreeNodes) {
    processArrayOfNodes({
      bookmarkNodes: bookmarkTreeNodes,
      query,
      parentNodes: [],
      enableExcludeRule: true,
    });
    const [optionDoms, rencentOptionDoms] = getSelect2Options();
    const recentFolders = getRecentFolders();
    for (i = recentFolders.length - 1; i >= 0; i--) {
      const id = recentFolders[i].id;
      const item = rencentOptionDoms.find((i) => i.id === id);
      item && optionDoms.unshift(item.dom);
    }
    optionDoms.unshift(`<option value="" selected>${defaultOption}</option>`);
    $('select#select-box').html(optionDoms.join(''));
    $('select#select-box').select2({ matcher: matcher });
  });
}
