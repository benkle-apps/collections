
$(() => {
    $('button[name="itemNo"]').click((event) => {
        event.preventDefault();
        $.ajax({
            dataType: 'json',
            url: $(event.target).closest('form').attr('action'),
            method: 'POST',
            data: {
                itemNo: $(event.target).val()
            }
        }).then((response) => {
            if (response.owned) {
                $(event.target).text('Remove');
                $(event.target).closest('tr').addClass("bg-info text-light");
            } else {
                $(event.target).text('Add');
                $(event.target).closest('tr').removeClass("bg-info text-light");
            }
        });
    });
});