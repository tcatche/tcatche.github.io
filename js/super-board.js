/**
 * Super-board plugin
 * @author PPOffice { @link https://github.com/ppoffice }
 */
(function($, CONFIG) {

  var $main = $(".super-board");
  var $input = $main.find(".super-board-search-input");
  var $secondWrapper = $main.find(".super-board-detail-wrapper");
  var $secondContainer = $main.find(".super-board-detail-container");
  var $postsWrapper = $main.find(".super-board-posts-wrapper");
  var $postsContainer = $main.find(".super-board-posts-container");
  $main.parent().remove(".super-board-search");
  $("body").append($main);

  function renderCategoryHeader(type) {
    return $("<section>")
      .addClass("super-board-section")
      .addClass("super-board-section-" + type);
  }

  function renderCategoryItem(item) {
    const { icon, title, slug, preview, url, count, date, type } = item;
    if (item.icon === 'file') {
      console.log(item);
    }
    return $("<div>")
      .addClass("super-board-search-item")
      .addClass("super-board-open-post-item")
      .addClass("super-board-type-" + icon)
      .append(
        $("<header>")
          // .append(
          //   icon ? $("<i>")
          //     .addClass("iconfont ")
          //     .addClass("icon-" + icon)
          //     : null
          // )
          .append(
            title != null && title != ""
              ? title
              : CONFIG.TRANSLATION["UNTITLED"]
          )
          .append(
            count > 0 ? '<span class="super-board-item-count">(' + count + ')</span>' : ''
          )
      )
      .attr('data-type', type)
      .attr('data-title', title)
      .attr('data-target', slug)
      .attr("data-url", url);
  }

  function renderCategoryFactory(type, array) {
    var sectionTitle;
    var $searchItems;
    if (array.length === 0) return null;
    sectionTitle = CONFIG.TRANSLATION[type];
    switch (type) {
      case "POSTS":
      case "PAGES":
        $searchItems = array.map(function(item) {
          // Use config.root instead of permalink to fix url issue
          return renderCategoryItem(item);
        });
        break;
      case "CATEGORIES":
        $searchItems = array.map(function(item) {
          return renderCategoryItem({
            ...item,
            title: item.name,
            type,
            icon: "folder",
            url: item.permalink,
          });
        });
        break;
      case "TAGS":
        $searchItems = array.map(function(item) {
          return renderCategoryItem({
            ...item,
            title: item.name,
            type,
            icon: "tag",
            url: item.permalink,
          });
        });
        break;
      case "ARCHIVES":
        $searchItems = array.map(function(item) {
          return renderCategoryItem({
            ...item,
            title: item.name,
            type,
            icon: "archives",
            url: item.permalink,
          });
        });
        break;
      default:
        return null;
    }
    $secondContainer.empty();
    return $secondContainer.append(renderCategoryHeader(type).append($searchItems));
  }

  function extractToSet(json, key) {
    var values = {};
    var entries = json.pages.concat(json.posts);
    entries.forEach(function(entry) {
      if (entry[key]) {
        entry[key].forEach(function(value) {
          if (!values[value.name]) {
            values[value.name] = value;
            values[value.name].count = 0;
          }
          values[value.name].count += 1;
        });
      }
    });
    var result = [];
    for (var key in values) {
      result.push(values[key]);
    }
    return result;
  }

  function parseKeywords(keywords) {
    return keywords
      .split(" ")
      .filter(function(keyword) {
        return !!keyword;
      })
      .map(function(keyword) {
        return keyword.toUpperCase();
      });
  }

  /**
   * Judge if a given post/page/category/tag contains all of the keywords.
   * @param Object            obj     Object to be weighted
   * @param Array<String>     fields  Object's fields to find matches
   */
  function filter(keywords, obj, fields) {
    var result = false;
    var keywordArray = parseKeywords(keywords);
    var containKeywords = keywordArray.filter(function(keyword) {
      var containFields = fields.filter(function(field) {
        if (!obj.hasOwnProperty(field)) return false;
        if (obj[field].toUpperCase().indexOf(keyword) > -1) return true;
      });
      if (containFields.length > 0) return true;
      return false;
    });
    return containKeywords.length === keywordArray.length;
  }

  function filterFactory(keywords) {
    return {
      POST: function(obj) {
        return filter(keywords, obj, ["title", "text"]);
      },
      PAGE: function(obj) {
        return filter(keywords, obj, ["title", "text"]);
      },
      CATEGORY: function(obj) {
        return filter(keywords, obj, ["name", "slug"]);
      },
      TAG: function(obj) {
        return filter(keywords, obj, ["name", "slug"]);
      }
    };
  }

  /**
   * Calculate the weight of a matched post/page/category/tag.
   * @param Object            obj     Object to be weighted
   * @param Array<String>     fields  Object's fields to find matches
   * @param Array<Integer>    weights Weight of every field
   */
  function weight(keywords, obj, fields, weights) {
    var value = 0;
    parseKeywords(keywords).forEach(function(keyword) {
      var pattern = new RegExp(keyword, "img"); // Global, Multi-line, Case-insensitive
      fields.forEach(function(field, index) {
        if (obj.hasOwnProperty(field)) {
          var matches = obj[field].match(pattern);
          value += matches ? matches.length * weights[index] : 0;
        }
      });
    });
    return value;
  }

  function weightFactory(keywords) {
    return {
      POST: function(obj) {
        return weight(keywords, obj, ["title", "text"], [3, 1]);
      },
      PAGE: function(obj) {
        return weight(keywords, obj, ["title", "text"], [3, 1]);
      },
      CATEGORY: function(obj) {
        return weight(keywords, obj, ["name", "slug"], [1, 1]);
      },
      TAG: function(obj) {
        return weight(keywords, obj, ["name", "slug"], [1, 1]);
      }
    };
  }

  function search(json, keywords) {
    var WEIGHTS = weightFactory(keywords);
    var FILTERS = filterFactory(keywords);
    var posts = json.posts;
    var pages = json.pages;
    var tags = extractToSet(json, "tags");
    var categories = extractToSet(json, "categories");

    return {
      posts: posts
        .filter(FILTERS.POST)
        .sort(function(a, b) {
          return WEIGHTS.POST(b) - WEIGHTS.POST(a);
        })
        .slice(0, 10),
      pages: pages
        .filter(FILTERS.PAGE)
        .sort(function(a, b) {
          return WEIGHTS.PAGE(b) - WEIGHTS.PAGE(a);
        })
        .slice(0, 5),
      categories: categories
        .filter(FILTERS.CATEGORY)
        .sort(function(a, b) {
          return WEIGHTS.CATEGORY(b) - WEIGHTS.CATEGORY(a);
        })
        .slice(0, 8),
      tags: tags.filter(FILTERS.TAG).sort(function(a, b) {
        return WEIGHTS.TAG(b) - WEIGHTS.TAG(a);
      })
    };
  }

  function searchResultToDOM(searchResult) {
    $secondContainer.empty();
    for (var key in searchResult) {
      $secondContainer.append(renderCategoryFactory(key.toUpperCase(), searchResult[key]));
    }
  }

  function scrollTo($item) {
    if ($item.length === 0) return;
    var wrapperHeight = $secondWrapper[0].clientHeight;
    var itemTop = $item.position().top - $secondWrapper.scrollTop();
    var itemBottom = $item[0].clientHeight + $item.position().top;
    if (itemBottom > wrapperHeight + $secondWrapper.scrollTop()) {
      $secondWrapper.scrollTop(itemBottom - $secondWrapper[0].clientHeight);
    }
    if (itemTop < 0) {
      $secondWrapper.scrollTop($item.position().top);
    }
  }

  function selectItemByDiff(value) {
    var $items = $.makeArray($secondContainer.find(".super-board-selectable"));
    var prevPosition = -1;
    $items.forEach(function(item, index) {
      if ($(item).hasClass("active")) {
        prevPosition = index;
        return;
      }
    });
    var nextPosition = ($items.length + prevPosition + value) % $items.length;
    $($items[prevPosition]).removeClass("active");
    $($items[nextPosition]).addClass("active");
    scrollTo($($items[nextPosition]));
  }

  function gotoLink($item) {
    if ($item && $item.length) {
      location.href = $item.attr("data-url");
    }
  }

  function superBoard() {
    let superBoardData;
    function showSuperBoard() {
      // $main.fadeIn();
      $main.show();
    }
    function hideSuperBoard() {
      // $main.fadeOut();
      $main.hide();
    }

    function toggleSuperBoard() {
      $main.fadeToggle();
    }

    function renderArchives() {
      const data = superBoardData.query.archives;
      $secondContainer.empty();
      const $archivesItems = Object.values(data).filter(item => item.isYear).map(item => (
        $("<div>")
          .addClass("super-board-type-archive")
          .append(
            $("<div>")
              .addClass("super-board-year-item")
              .addClass('super-board-search-item')
              .addClass("super-board-open-post-item")
              .attr('data-type', 'ARCHIVES')
              .attr('data-target', item.slug)
              .append(
                $("<header>")
                  .append(item.slug)
                  .append('<span class="super-board-item-count">(' + item.posts.length + ')</span>')
              ),
            $("<div>")
              .addClass("super-board-year-children")
              .append(
                Object.values(item.yearMonth).map(monthItem => (
                  $("<div>")
                    .addClass("super-board-open-post-item")
                    .addClass('super-board-search-item')
                    .attr('data-type', 'ARCHIVES')
                    .attr('data-target', monthItem.slug)
                    .append(
                      $("<header>")
                        .append(monthItem.slug)
                        .append('<span class="super-board-item-count">(' + monthItem.posts.length + ')</span>')
                    )
                ))
              )
          )
      ))
      $secondContainer.append(renderCategoryHeader("ARCHIVES")).append($archivesItems);
      $secondWrapper.removeClass('hide');
    }

    function renderPostItem(item) {
      const { icon, title, text, path, date } = item;
      return $("<div>")
        .addClass("super-board-search-item")
        .addClass("super-board-post-item")
        .addClass("super-board-type-file")
        .append(
          $("<header>")
            .append(
              title || CONFIG.TRANSLATION["UNTITLED"]
            )
        )
        .append(
          $("<p>")
            .addClass("super-board-search-preview")
            .text(text.slice(0, 150))
        )
        .append(
          $("<p>")
            .addClass("super-board-search-preview")
            .text(date.substr(0, 10))
        )
        .attr('data-type', 'LINK')
        .attr("data-url", CONFIG.ROOT_URL + item.path);
    }

    function renderPosts(type, key) {
      const data = superBoardData;
      let $data;
      $postsWrapper.removeClass('hide');
      $postsContainer.empty();
      if (type === 'NEW') {
        $data = data.posts.slice(0, 10);
      } else if (type === 'UPDATED') {
        $data = data.updated.slice(0, 10);
      } else if (type === 'TAGS') {
        $data = data.query.tags[key].posts;
      } else if (type === 'CATEGORIES') {
        $data = data.query.categories[key].posts;
      } else if (type === 'ARCHIVES') {
        $data = data.query.archives[key].posts;
      }
      const $results = $data.map(function(item) {
        // Use config.root instead of permalink to fix url issue
        return renderPostItem({
          ...item,
          type: 'LINK',
          icon: "file",
          preview: item.text.slice(0, 150),
        });
      });
      $postsContainer.append($results);
    }

    function renderBookmark() {
      var hList = [].filter.call($('article').find('h2, h3, h4'), function(ele) {
        return ele.textContent.trim().length > 0;
      });
      if (hList.length > 0) {
        var lastTagName = hList[0].tagName.toLowerCase();
        var list = '<div class="mark-container"><ul class="mark-list">';
        hList.forEach(function(item) {
          var currTagName = item.tagName.toLowerCase();
          var text = item.textContent.trim();
          if (currTagName > lastTagName) {
            list += '<ul class="mark-' + currTagName +'">'
            list += '<li class="mark-' + currTagName +'">' + '<a href="#" data-target="#' + item.id + '" title="' + text + '">' + text +'</a>';
          } else if (currTagName === lastTagName) {
            list += '</li><li class="mark-' + currTagName +'">' + '<a href="#" data-target="#' + item.id + '" title="' + text + '">' + text +'</a>';
          } else {
            list += '</ul></li>';
            list += '<li class="mark-' + currTagName +'">' + '<a href="#" data-target="#' + item.id + '" title="' + text + '">' + text +'</a>';
          }
          lastTagName = currTagName;
        });
        list += '</ul></div>';
        $secondContainer.empty();
        $secondContainer.append(list);
        $secondWrapper.removeClass('hide');
      }
    }

    function renderPostsBoard(ele) {
      const $ele = $(ele);
      const type = $ele.data('type');
      if (type === 'LINK') {
        gotoLink($ele);
      } else {
        $ele.siblings().removeClass('active');
        $ele.addClass('active');
        renderPosts(type, $ele.data('target'));
      }
    }

    function renderClickedSiderItem(ele) {
      const $current = $(ele);
      console.log(ele);
      const type = $current.data('target');
      if (type) {
        $('.sider-item.active').removeClass('active');
        // 当前点击元素高亮
        $current.addClass('active');
        $secondWrapper.addClass('hide');
        $postsWrapper.addClass('hide');
        switch(type) {
          case 'NEW':
          case 'UPDATED':
            renderPosts(type);
            break;
          case 'TOC':
            renderBookmark();
            break;
          case 'ARCHIVES':
            renderArchives();
            break;
          case 'CATEGORIES':
          case 'TAGS':
            $secondWrapper.removeClass('hide');
            $secondContainer.empty();
            const data = superBoardData[type.toLowerCase()];
            renderCategoryFactory(type, data);
            break;
        }
      }
    }

    function showSuperBoardPannel(type, target) {
      showSuperBoard();
      const siderItem = $main.find('.sider-item[data-target="' + type + '"]')
      renderClickedSiderItem(siderItem);
      if (target) {
        const searchItem = $main.find('.super-board-search-item[data-target="' + target + '"]')
        $(searchItem).trigger('click');
        // renderPostsBoard(searchItem);
      }
    }

    function bind() {
      $(document)
        .on("click", ".show-super-board-icon", function() {
          showSuperBoard();
          // $main.find(".super-board-search-input").focus();
        })
        .on("click", ".super-board-open-post-item", function(evt) {
          renderPostsBoard(evt.currentTarget);
        })
        .on("click", ".super-board-year-item", function(evt) {
          $(evt.currentTarget).next().slideToggle();
        })
        .on("click", ".super-board-post-item", function(evt) {
          gotoLink($(evt.currentTarget));
        })
        .on("click", ".super-board-search-close", function() {
          hideSuperBoard();
        })
        .on("click", ".mark-container a", function(ele) {
          var id = $(ele.target).data('target');
          var top = $(id)[0].offsetTop;
          if (top) {
            hideSuperBoard();
            $('html').animate({ scrollTop: top }, 600);
          }
        })
        .on("click", ".super-board .sider-item", function(ele) {
          renderClickedSiderItem(ele.currentTarget);
        })
        .on("keydown", function(e) {
          if (!$main.hasClass("show")) return;
          switch (e.keyCode) {
            case 27: // ESC
              $main.removeClass("show");
              break;
            case 38: // UP
              selectItemByDiff(-1);
              break;
            case 40: // DOWN
              selectItemByDiff(1);
              break;
            case 13: //ENTER
              gotoLink($secondContainer.find(".super-board-selectable.active").eq(0));
              break;
          }
        });
    }

    function bindOuter() {
      $(document)
        .on("click", ".show-super-board", function(ele) {
          const $target = $(ele.currentTarget);
          const type = $target.data('type');
          const target = $target.data('target');
          showSuperBoardPannel(type, target);
        })
    }

    function init() {
      $.getJSON(CONFIG.CONTENT_URL, function(json) {
        if (location.hash.trim() === "#super-board-search") {
          $main.addClass("show");
        }
        $input.on("input", function() {
          var keywords = $(this).val();
          searchResultToDOM(search(json, keywords));
        });
        $input.trigger("input");
        const query = {
          categories: {},
          tags: {},
          archives: {},
        }
        json.query = query;
        window.superBoardData = json;
        superBoardData = json;
        json.new = json.posts.sort((a, b) => new Date(b.date) - new Date(a.date));
        json.updated = json.posts.slice().sort((a, b) => new Date(b.updated) - new Date(a.updated));
        json.posts.forEach(post => {
          post.categoryNames = post.categories.map(category => {
            if (!query.categories[category.slug]) {
              query.categories[category.slug] = category;
              query.categories[category.slug].posts = [];
            }
            query.categories[category.slug].posts.push(post);
            return category.slug
          });
          post.tagNames = post.tags.map(tag => {
            if (!query.tags[tag.slug]) {
              query.tags[tag.slug] = tag;
              query.tags[tag.slug].posts = [];
            }
            query.tags[tag.slug].posts.push(post);
            return tag.slug;
          });
          const year = post.date.substr(0, 4);
          const yearMonth = post.date.substr(0, 7);
          const month = post.date.substr(5, 2);
          post.year = year;
          post.yearMonth = yearMonth;

          if (!query.archives[yearMonth]) {
            query.archives[yearMonth] = {
              name: yearMonth,
              slug: yearMonth,
              posts: [],
              count: 0,
              month,
              year,
              isYear: false,
              isYearMonth: true,
            }
          }
          query.archives[yearMonth].posts.push(post);
          query.archives[yearMonth].count += 1;

          if (!query.archives[year]) {
            query.archives[year] = {
              name: year,
              slug: year,
              posts: [],
              count: 0,
              yearMonth: {},
              isYear: true,
              isYearMonth: false,
            }
          }
          query.archives[year].posts.push(post);
          query.archives[year].count += 1;
          query.archives[year].yearMonth[yearMonth] = query.archives[yearMonth];
        });
        json.categories = json.categories.map(item => json.query.categories[item.slug]);
        json.tags = json.tags.map(item => json.query.tags[item.slug]);

        bind();
        bindOuter();
      });
    }
    return {
      init,
    }
  };

  superBoard().init();
})(jQuery, window.INSIGHT_CONFIG);
