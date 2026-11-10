/* 기본 카테고리와 예시 데이터
   - sample: true 인 항목은 화면에 "예시" 표시가 붙고, 하단 "예시 데이터 지우기"로 한 번에 지울 수 있어요.
   - 실제 내용은 앱 화면에서 추가·수정하면 브라우저에 저장됩니다. */

(function () {
  function pad(n) { return String(n).padStart(2, '0'); }
  function day(offset) {
    var d = new Date();
    d.setDate(d.getDate() + offset);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  /* 내가 직접 넣은 곡: 날짜·영상·악보는 나중에 앱에서 채워요 */
  function song(slug, title, artist, catId, since) {
    return {
      id: 'real-' + slug, title: title, artist: artist, date: '',
      catId: catId, subId: '', youtube: '', sheet: '', memo: '', since: since || 3
    };
  }

  /* 다녀온 여행: 연도만 아는 곳은 when 에 적고, 지도 핀은 대표 위치(대략)예요.
     subName 은 해외 아래 세부 분류 이름이고, 이미 같은 이름이 있으면 그걸 써요. */
  function trip(slug, place, when, subName, lat, lng, review, since) {
    return {
      id: 'real-trip-' + slug, status: 'done', place: place, date: '', when: when, rating: 0,
      catId: 'tr-world', subName: subName, subId: '', lat: lat, lng: lng,
      review: review || '', photos: [], links: [], since: since || 6
    };
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
  function seasons(prefix) {
    return [
      { id: prefix + '-sp', name: '봄' },
      { id: prefix + '-su', name: '여름' },
      { id: prefix + '-fa', name: '가을' },
      { id: prefix + '-wi', name: '겨울' }
    ];
  }

  window.DEFAULT_DATA = {
    /* 기본 데이터를 바꿀 때마다 1씩 올려요. 이미 저장된 브라우저에는
       예시 기록만 새 내용으로 바뀌고, 직접 입력한 기록은 그대로 남아요. */
    dataVersion: 7,
    /* 새 내용으로 바꾸면서 지울 옛 "예시" 기록 (예시 표시가 남아 있는 것만 지워요) */
    retire: [
      { list: 'exercise', id: 'e1' }, { list: 'exercise', id: 'e2' }, { list: 'exercise', id: 'e3' },
      { list: 'exercise', id: 'e4' }, { list: 'exercise', id: 'e5' }, { list: 'exercise', id: 'e6' },
      { list: 'songs', id: 's1' }, { list: 'songs', id: 's2' },
      { list: 'trips', id: 't1' }, { list: 'trips', id: 't2' }
    ],
    /* 이미 저장된 기록의 값이 from 과 같을 때만 to 로 고쳐요 (직접 고친 값은 건드리지 않아요) */
    fixes: [
      { list: 'songs', id: 'real-bombombom', field: 'memo', from: '흔들리는 꽃들 속에서 네 샴푸향이 느껴진거야', to: '' }
    ],
    categories: {
      exercise: [
        { id: 'ex-walk', name: '워킹', children: [] },
        { id: 'ex-bike', name: '자전거', children: [] },
        { id: 'ex-swim', name: '수영', children: [] }
      ],
      music: [
        { id: 'mu-piano', name: '피아노연주', children: seasons('mu-piano') },
        { id: 'mu-band', name: '밴드반주', children: seasons('mu-band') },
        { id: 'mu-vocal', name: '보컬트레이닝', children: seasons('mu-vocal') }
      ],
      travel: [
        {
          id: 'tr-kr', name: '국내', children: [
            { id: 'tr-kr-seoul', name: '서울' },
            { id: 'tr-kr-busan', name: '부산' },
            { id: 'tr-kr-jeju', name: '제주' },
            { id: 'tr-kr-gangneung', name: '강릉' }
          ]
        },
        {
          id: 'tr-world', name: '해외', children: [
            { id: 'tr-w-jp', name: '일본' },
            { id: 'tr-w-fr', name: '프랑스' },
            { id: 'tr-w-vn', name: '베트남' }
          ]
        }
      ]
    },

    exercise: exerciseWeek(),

    songs: [
      {
        id: 'real-bombombom', title: '봄봄봄', artist: '로이킴', date: '',
        catId: 'mu-piano', subId: 'mu-piano-sp',
        youtube: '', sheet: '', memo: '', since: 2
      },
      /* 피아노 연주·반주 */
      song('flowers-shampoo', '흔들리는 꽃들 속에서 네 샴푸향이 느껴진거야', '장범준', 'mu-piano', 4),
      song('yurichang', '유리창엔 비', '햇빛촌', 'mu-piano'),
      song('autumn-post', '가을 우체국 앞에서', '윤도현', 'mu-piano'),
      song('red-sunset', '붉은 노을', '빅뱅', 'mu-piano'),
      song('one-page', '한 페이지가 될 수 있게', 'DAY6', 'mu-piano'),
      song('trip-to-me', '나에게로 떠나는 여행', '버즈', 'mu-piano'),
      song('jeju-night', '제주도의 푸른 밤', '태연', 'mu-piano'),
      song('hyehwa', '혜화동', '박보람', 'mu-piano'),
      song('aloha', '아로하', '조정석', 'mu-piano'),
      song('rain-you', '비와 당신', '이무진', 'mu-piano'),
      /* 보컬 */
      song('thirty', '서른 즈음에', '김광석', 'mu-vocal'),
      song('unknown-life', '알 수 없는 인생', '이문세', 'mu-vocal'),
      song('butterfly', '나는 나비', '윤도현', 'mu-vocal'),
      song('your-meaning', '너의 의미', '아이유, 김창완', 'mu-vocal'),
      song('all-for-you', 'ALL FOR YOU', '정은지, 서인국', 'mu-vocal'),
      song('musical', '뮤지컬', '임상아', 'mu-vocal'),
      {
        id: 's3', title: 'Hotel California', artist: 'Eagles', date: day(-90),
        catId: 'mu-band', subId: 'mu-band-su',
        youtube: '', sheet: '', memo: '밴드 합주 연습 중 (예시)', sample: true
      }
    ],

    trips: [
      trip('europe-1998', '서유럽 배낭여행', '1998', '서유럽', 48.8566, 2.3522, '45일 배낭여행'),
      trip('vancouver-2000', '밴쿠버 어학연수', '2000', '캐나다', 49.2827, -123.1207, '어학연수 6개월'),
      trip('canada-east-2000', '캐나다 동부', '2000', '캐나다', 45.5019, -73.5674, '토론토, 몬트리올, 퀘벡'),
      trip('newyork-2000', '뉴욕', '2000', '미국', 40.7128, -74.006),
      trip('us-west-2001', '미국 서부', '2001', '미국', 37.7749, -122.4194, 'LA, 샌프란시스코, 시애틀'),
      trip('beijing-2002', '북경', '2002', '중국', 39.9042, 116.4074, '', 7),
      trip('zhangjiajie-2002', '장가계', '2002', '중국', 29.117, 110.479, '', 7),
      trip('asia-2004', '아시아 여행', '2004', '아시아', '', ''),
      trip('us-central-2004', '미국 중부', '2004', '미국', 39.8283, -98.5795),
      trip('asia-2005', '아시아 여행', '2005', '아시아', '', ''),
      trip('asia-2008', '아시아 여행', '2008', '아시아', '', ''),
      trip('asia-2014', '아시아 여행', '2014', '아시아', '', ''),
      trip('asia-2016', '아시아 여행', '2016', '아시아', '', ''),
      trip('asia-2025', '아시아 여행', '2025', '아시아', '', ''),
      trip('us-central-2025', '미국 중부', '2025', '미국', 39.8283, -98.5795),
      trip('germany-2025', '독일', '2025', '독일', 51.1657, 10.4515, '유럽 여행'),
      trip('asia-2026', '아시아 여행', '2026', '아시아', '', ''),
      {
        id: 't3', status: 'want', place: '교토', date: '', rating: 0,
        catId: 'tr-world', subId: 'tr-w-jp', lat: 35.0116, lng: 135.7681,
        review: '단풍철에 가 보고 싶어요. (예시)', photos: [],
        links: [
          { title: '교토 여행 블로그 (예시)', url: 'https://example.com/kyoto' },
          { title: '교토 맛집 정리 (예시)', url: 'https://example.com/kyoto-food' }
        ],
        sample: true
      },
      {
        id: 't4', status: 'want', place: '파리', date: '', rating: 0,
        catId: 'tr-world', subId: 'tr-w-fr', lat: 48.8566, lng: 2.3522,
        review: '', photos: [], links: [], sample: true
      },
      {
        id: 't5', status: 'want', place: '강릉 커피거리', date: '', rating: 0,
        catId: 'tr-kr', subId: 'tr-kr-gangneung', lat: 37.7719, lng: 128.9484,
        review: '', photos: [], links: [], sample: true
      }
    ]
  };
})();
