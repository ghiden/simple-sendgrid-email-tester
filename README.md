# Simple Sendgrid Email Tester

1. Copy config.json.example to config.json and edit your API details.

    ```
    cp config.json.example config.json
    ```

2. Prepare contacts file in csv format with header   

    ```
    firstName, lastName, email
    John, Doe, johndoe@example.com
    ...
    ```
    ** 'email' header is needed

3. Prepare a email template.

4. (Optional) Prepare substitutions file

    ```
    %%firstName%%, firstName
    %%lastName%%, lastName
    ```

5. Send

    ```
    npm start -- template.html contacts.csv --substitutions subs.csv
    ```
