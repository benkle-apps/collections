
$(() => {
    $('button[name="itemNo"]').click((event) => {
        event.preventDefault();
        let button = $(event.target);
        if (!button.is('button')) {
            button = button.closest('button');
        }
        $.ajax({
            dataType: 'json',
            url: button.closest('form').attr('action'),
            method: 'POST',
            data: {
                itemNo: button.val()
            }
        }).then((response) => {
            if (response.owned) {
                button.find('span').text('Remove');
                button.closest('tr').addClass("bg-info text-light");
            } else {
                button.find('span').text('Add');
                button.closest('tr').removeClass("bg-info text-light");
            }
        });
    });
});