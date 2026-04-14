const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendEmail = (emailData) => {
  sgMail.send(emailData).then(
    () => {
      console.log(`Email sent to email ${emailData}.`);
    },
    (error) => {
      console.error(error);
      if (error.response) {
        console.error(error.response.body);
      }
    }
  );
};

module.exports = {
  sendEmail,
};
