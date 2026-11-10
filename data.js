/* 기본 카테고리와 기록 데이터
   - 2026-11-10 PC에서 정리한 백업(연주곡 17곡, 여행 19건)을 기본 데이터로 넣었어요.
   - 처음 여는 브라우저는 이 내용으로 시작하고, 이미 기록이 저장된 브라우저는 저장된 내용이 우선이에요.
   - sample: true 인 항목은 화면에 "예시" 표시가 붙고, 하단 "예시 데이터 지우기"로 한 번에 지울 수 있어요. */

(function () {
  function pad(n) { return String(n).padStart(2, '0'); }
  function day(offset) {
    var d = new Date();
    d.setDate(d.getDate() + offset);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  /* 운동 예시: 평일 점심시간(12:00~12:50) 걷기·자전거, 주말 걷기 1시간 — 최근 7일 */
  function exerciseWeek() {
    var plan = {
      1: ['ex-walk', 30], 2: ['ex-bike', 20], 3: ['ex-walk', 30], 4: ['ex-bike', 20], 5: ['ex-walk', 30],
      6: ['ex-walk', 60, '피아노학원 오가는 길'], 0: ['ex-walk', 60, '가까운 곳 산책']
    };
    var out = [];
    for (var i = 0; i >= -6; i--) {
      var ds = day(i), p = plan[new Date(ds + 'T00:00:00').getDay()];
      out.push({
        id: 'ex5-' + ds, date: ds, catId: p[0], min: p[1],
        memo: (p[2] || '점심시간 12:00~12:50') + ' (예시)', sample: true, since: 5
      });
    }
    return out;
  }
  window.DEFAULT_DATA = {
    /* 기본 데이터를 바꿀 때마다 1씩 올려요. 이미 저장된 브라우저에는
       새로 추가된(since) 기록만 들어가고, 직접 입력한 기록은 그대로 남아요. */
    dataVersion: 8,
    retire: [],
    fixes: [],
    categories: {
      "exercise": [
        {
          "id": "ex-walk",
          "name": "워킹",
          "children": []
        },
        {
          "id": "ex-bike",
          "name": "자전거",
          "children": []
        },
        {
          "id": "ex-swim",
          "name": "수영",
          "children": []
        }
      ],
      "music": [
        {
          "id": "mu-piano",
          "name": "피아노연주",
          "children": [
            {
              "id": "mu-piano-sp",
              "name": "봄"
            },
            {
              "id": "mu-piano-su",
              "name": "여름"
            },
            {
              "id": "mu-piano-fa",
              "name": "가을"
            },
            {
              "id": "mu-piano-wi",
              "name": "겨울"
            }
          ]
        },
        {
          "id": "mu-band",
          "name": "밴드반주",
          "children": [
            {
              "id": "mu-band-sp",
              "name": "봄"
            },
            {
              "id": "mu-band-su",
              "name": "여름"
            },
            {
              "id": "mu-band-fa",
              "name": "가을"
            },
            {
              "id": "mu-band-wi",
              "name": "겨울"
            }
          ]
        },
        {
          "id": "mu-vocal",
          "name": "보컬트레이닝",
          "children": [
            {
              "id": "mu-vocal-sp",
              "name": "봄"
            },
            {
              "id": "mu-vocal-su",
              "name": "여름"
            },
            {
              "id": "mu-vocal-fa",
              "name": "가을"
            },
            {
              "id": "mu-vocal-wi",
              "name": "겨울"
            }
          ]
        }
      ],
      "travel": [
        {
          "id": "tr-kr",
          "name": "국내",
          "children": [
            {
              "id": "tr-kr-seoul",
              "name": "서울"
            },
            {
              "id": "tr-kr-busan",
              "name": "부산"
            },
            {
              "id": "tr-kr-jeju",
              "name": "제주"
            },
            {
              "id": "tr-kr-gangneung",
              "name": "강릉"
            },
            {
              "id": "sxmwaahqnyf8sw",
              "name": "전주"
            }
          ]
        },
        {
          "id": "tr-world",
          "name": "해외",
          "children": [
            {
              "id": "tr-w-jp",
              "name": "일본"
            },
            {
              "id": "tr-w-fr",
              "name": "프랑스"
            },
            {
              "id": "tr-w-vn",
              "name": "베트남"
            },
            {
              "id": "sxmwaa616zed2c",
              "name": "서유럽"
            },
            {
              "id": "sxmwaa616z1ow7",
              "name": "캐나다"
            },
            {
              "id": "sxmwaa616zprlx",
              "name": "미국"
            },
            {
              "id": "sxmwaa616z7g22",
              "name": "아시아"
            },
            {
              "id": "sxmwaa616z83p4",
              "name": "독일"
            },
            {
              "id": "sxmwac0fny3ws2",
              "name": "중국"
            }
          ]
        }
      ]
    },

    exercise: exerciseWeek(),

    songs: [
      {
        "id": "real-bombombom",
        "title": "봄봄봄",
        "artist": "로이킴",
        "date": "2026-04-10",
        "catId": "mu-piano",
        "subId": "mu-piano-sp",
        "youtube": "",
        "sheet": "",
        "memo": ""
      },
      {
        "id": "real-yurichang",
        "title": "유리창엔 비",
        "artist": "햇빛촌",
        "date": "",
        "catId": "mu-piano",
        "subId": "mu-piano-fa",
        "youtube": "",
        "sheet": "",
        "memo": ""
      },
      {
        "id": "real-autumn-post",
        "title": "가을 우체국 앞에서",
        "artist": "윤도현",
        "date": "2026-10-10",
        "catId": "mu-piano",
        "subId": "mu-piano-fa",
        "youtube": "https://youtu.be/7JtaL1YrODw?si=4iJNy2rKQ03Sa7OC",
        "sheet": "",
        "memo": ""
      },
      {
        "id": "real-red-sunset",
        "title": "붉은 노을",
        "artist": "빅뱅",
        "date": "",
        "catId": "mu-piano",
        "subId": "mu-piano-su",
        "youtube": "",
        "sheet": "",
        "memo": ""
      },
      {
        "id": "real-one-page",
        "title": "한 페이지가 될 수 있게",
        "artist": "DAY6",
        "date": "",
        "catId": "mu-band",
        "subId": "",
        "youtube": "",
        "sheet": "",
        "memo": ""
      },
      {
        "id": "real-trip-to-me",
        "title": "나에게로 떠나는 여행",
        "artist": "버즈",
        "date": "",
        "catId": "mu-band",
        "subId": "",
        "youtube": "",
        "sheet": "",
        "memo": ""
      },
      {
        "id": "real-jeju-night",
        "title": "제주도의 푸른 밤",
        "artist": "태연",
        "date": "2026-09-30",
        "catId": "mu-piano",
        "subId": "mu-piano-fa",
        "youtube": "",
        "sheet": "",
        "memo": ""
      },
      {
        "id": "real-hyehwa",
        "title": "혜화동",
        "artist": "박보람",
        "date": "2026-11-10",
        "catId": "mu-piano",
        "subId": "mu-piano-fa",
        "youtube": "https://youtu.be/-85QRBT40ag?si=1a7l4o_9zO7_609k",
        "sheet": "",
        "memo": ""
      },
      {
        "id": "real-aloha",
        "title": "아로하",
        "artist": "조정석",
        "date": "",
        "catId": "mu-piano",
        "subId": "mu-piano-wi",
        "youtube": "",
        "sheet": "",
        "memo": ""
      },
      {
        "id": "real-rain-you",
        "title": "비와 당신",
        "artist": "이무진",
        "date": "",
        "catId": "mu-piano",
        "subId": "mu-piano-wi",
        "youtube": "",
        "sheet": "",
        "memo": ""
      },
      {
        "id": "real-thirty",
        "title": "서른 즈음에",
        "artist": "김광석",
        "date": "",
        "catId": "mu-vocal",
        "subId": "",
        "youtube": "",
        "sheet": "",
        "memo": ""
      },
      {
        "id": "real-unknown-life",
        "title": "알 수 없는 인생",
        "artist": "이문세",
        "date": "",
        "catId": "mu-vocal",
        "subId": "",
        "youtube": "",
        "sheet": "",
        "memo": ""
      },
      {
        "id": "real-butterfly",
        "title": "나는 나비",
        "artist": "윤도현",
        "date": "",
        "catId": "mu-vocal",
        "subId": "",
        "youtube": "",
        "sheet": "",
        "memo": ""
      },
      {
        "id": "real-your-meaning",
        "title": "너의 의미",
        "artist": "아이유, 김창완",
        "date": "",
        "catId": "mu-vocal",
        "subId": "",
        "youtube": "",
        "sheet": "",
        "memo": ""
      },
      {
        "id": "real-all-for-you",
        "title": "ALL FOR YOU",
        "artist": "정은지, 서인국",
        "date": "",
        "catId": "mu-vocal",
        "subId": "",
        "youtube": "",
        "sheet": "",
        "memo": ""
      },
      {
        "id": "real-musical",
        "title": "뮤지컬",
        "artist": "임상아",
        "date": "",
        "catId": "mu-vocal",
        "subId": "",
        "youtube": "",
        "sheet": "",
        "memo": ""
      },
      {
        "id": "real-flowers-shampoo",
        "title": "흔들리는 꽃들 속에서 네 샴푸향이 느껴진거야",
        "artist": "장범준",
        "date": "2026-03-10",
        "catId": "mu-piano",
        "subId": "mu-piano-sp",
        "youtube": "",
        "sheet": "",
        "memo": ""
      }
    ],

    trips: [
      {
        "id": "t3",
        "status": "want",
        "place": "교토",
        "date": "",
        "rating": 0,
        "catId": "tr-world",
        "subId": "tr-w-jp",
        "lat": 35.0116,
        "lng": 135.7681,
        "review": "단풍철에 가 보고 싶어요. (예시)",
        "photos": [],
        "links": [
          {
            "title": "교토 여행 블로그 (예시)",
            "url": "https://example.com/kyoto"
          },
          {
            "title": "교토 맛집 정리 (예시)",
            "url": "https://example.com/kyoto-food"
          }
        ],
        "sample": true
      },
      {
        "id": "t4",
        "status": "want",
        "place": "베트남",
        "date": "",
        "rating": 0,
        "catId": "tr-world",
        "subId": "sxmwaa616z7g22",
        "lat": 48.8566,
        "lng": 2.3522,
        "review": "해산물요리 맛집투어 쉬고 싶어요",
        "photos": [],
        "links": [],
        "when": "2027"
      },
      {
        "id": "t5",
        "status": "want",
        "place": "강릉 커피거리",
        "date": "",
        "rating": 0,
        "catId": "tr-kr",
        "subId": "tr-kr-gangneung",
        "lat": 37.7719,
        "lng": 128.9484,
        "review": "",
        "photos": [],
        "links": [],
        "sample": true
      },
      {
        "id": "real-trip-europe-1998",
        "status": "done",
        "place": "서유럽",
        "date": "",
        "when": "1998",
        "rating": 0,
        "catId": "tr-world",
        "subId": "sxmwaa616zed2c",
        "lat": 48.8566,
        "lng": 2.3522,
        "review": "45일 배낭여행",
        "photos": [],
        "links": []
      },
      {
        "id": "real-trip-vancouver-2000",
        "status": "done",
        "place": "캐나다 밴쿠버",
        "date": "",
        "when": "2000",
        "rating": 0,
        "catId": "tr-world",
        "subId": "sxmwaa616z1ow7",
        "lat": 49.26087,
        "lng": -123.11395,
        "review": "어학연수 6개월",
        "photos": [],
        "links": []
      },
      {
        "id": "real-trip-canada-east-2000",
        "status": "done",
        "place": "캐나다 토론토",
        "date": "",
        "when": "2000",
        "rating": 0,
        "catId": "tr-world",
        "subId": "sxmwaa616z1ow7",
        "lat": 45.5019,
        "lng": -73.5674,
        "review": "토론토, 몬트리올, 퀘벡",
        "photos": [],
        "links": []
      },
      {
        "id": "real-trip-newyork-2000",
        "status": "done",
        "place": "미국 뉴욕",
        "date": "",
        "when": "2000",
        "rating": 0,
        "catId": "tr-world",
        "subId": "sxmwaa616zprlx",
        "lat": 40.7128,
        "lng": -74.006,
        "review": "",
        "photos": [],
        "links": []
      },
      {
        "id": "real-trip-us-west-2001",
        "status": "done",
        "place": "미국 LA",
        "date": "",
        "when": "2001",
        "rating": 0,
        "catId": "tr-world",
        "subId": "sxmwaa616zprlx",
        "lat": 34.05369,
        "lng": -118.24277,
        "review": "LA, 샌프란시스코, 시애틀",
        "photos": [],
        "links": []
      },
      {
        "id": "real-trip-us-central-2004",
        "status": "done",
        "place": "미국 샌디에이고",
        "date": "",
        "when": "2004",
        "rating": 0,
        "catId": "tr-world",
        "subId": "sxmwaa616zprlx",
        "lat": 32.71571,
        "lng": -117.16383,
        "review": "",
        "photos": [],
        "links": []
      },
      {
        "id": "real-trip-asia-2005",
        "status": "done",
        "place": "일본 삿포로",
        "date": "",
        "when": "2005",
        "rating": 0,
        "catId": "tr-world",
        "subId": "sxmwaa616z7g22",
        "lat": 43.06595,
        "lng": 141.35073,
        "review": "",
        "photos": [],
        "links": []
      },
      {
        "id": "real-trip-asia-2008",
        "status": "done",
        "place": "발리",
        "date": "",
        "when": "2008",
        "rating": 0,
        "catId": "tr-world",
        "subId": "sxmwaa616z7g22",
        "lat": -8.22713,
        "lng": 115.19192,
        "review": "",
        "photos": [],
        "links": []
      },
      {
        "id": "real-trip-asia-2014",
        "status": "done",
        "place": "일본 오사카",
        "date": "",
        "when": "2014",
        "rating": 0,
        "catId": "tr-world",
        "subId": "sxmwaa616z7g22",
        "lat": 34.70221,
        "lng": 135.49557,
        "review": "",
        "photos": [],
        "links": []
      },
      {
        "id": "real-trip-asia-2016",
        "status": "done",
        "place": "싱가포르",
        "date": "",
        "when": "2016",
        "rating": 0,
        "catId": "tr-world",
        "subId": "sxmwaa616z7g22",
        "lat": 1.35711,
        "lng": 103.8195,
        "review": "",
        "photos": [],
        "links": []
      },
      {
        "id": "real-trip-asia-2025",
        "status": "done",
        "place": "일본 도쿄",
        "date": "",
        "when": "2025",
        "rating": 0,
        "catId": "tr-world",
        "subId": "sxmwaa616z7g22",
        "lat": 35.68125,
        "lng": 139.76671,
        "review": "일본 도쿄 5일",
        "photos": [],
        "links": []
      },
      {
        "id": "real-trip-us-central-2025",
        "status": "done",
        "place": "미국 시카고",
        "date": "",
        "when": "2025",
        "rating": 0,
        "catId": "tr-world",
        "subId": "sxmwaa616zprlx",
        "lat": 41.87556,
        "lng": -87.62442,
        "review": "시카고\n퍼듀대학교",
        "photos": [],
        "links": []
      },
      {
        "id": "real-trip-germany-2025",
        "status": "done",
        "place": "독일 베를린",
        "date": "",
        "when": "2025",
        "rating": 0,
        "catId": "tr-world",
        "subId": "sxmwaa616z83p4",
        "lat": 51.1657,
        "lng": 10.4515,
        "review": "IFA 국제박람회 전시관 운영",
        "photos": [],
        "links": []
      },
      {
        "id": "real-trip-asia-2026",
        "status": "done",
        "place": "일본 후쿠오카",
        "date": "",
        "when": "2026",
        "rating": 0,
        "catId": "tr-world",
        "subId": "sxmwaa616z7g22",
        "lat": 33.5899,
        "lng": 130.40175,
        "review": "일본 후쿠오카 4일",
        "photos": [],
        "links": []
      },
      {
        "id": "real-trip-beijing-2002",
        "status": "done",
        "place": "북경",
        "date": "",
        "when": "2002",
        "rating": 0,
        "catId": "tr-world",
        "subId": "sxmwac0fny3ws2",
        "lat": 39.9042,
        "lng": 116.4074,
        "review": "",
        "photos": [],
        "links": []
      },
      {
        "id": "real-trip-zhangjiajie-2002",
        "status": "done",
        "place": "장가계",
        "date": "",
        "when": "2002",
        "rating": 0,
        "catId": "tr-world",
        "subId": "sxmwac0fny3ws2",
        "lat": 29.117,
        "lng": 110.479,
        "review": "",
        "photos": [],
        "links": []
      }
    ]
  };
})();
