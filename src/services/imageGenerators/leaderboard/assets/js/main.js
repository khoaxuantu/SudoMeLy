function renderUI(userList = []) {
    const userListElement = document.querySelector(".leaderboard__content-userList");
    userListElement.innerHTML = userList.map((user, index) => {
        return `
      <div class="userItem rowItem" data-userId=${user.id}>
        <div class="row">
          <div class="col">
            <div class="rank">
              <span>#${index + 1}</span>
              <div class="avatar">
                <img src="${user.avatar}" alt="" />
              </div>
            </div>
          </div>
          <div class="col">
            <span class="userName">${user.username}</span>
          </div>
          <div class="col"><span class="score">${user.OP}</span></div>
          <div class="col"><span class="title">${user.title}</span></div>
        </div>
      </div>
      `;
    }
    ).join("");
}

renderUI(data);
