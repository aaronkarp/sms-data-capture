# sms-data-capture
An extension of AEM's out of the box Form component to facilitate sending data to remote endpoints.

I initially created this when one of our AEM back-end developers said it would take six weeks. That surprised me, because I was pretty sure I could do it in a few days - and I did!

The additions to the Form component allow the author to set up the two endpoints needed for the form we had to create, one for mailing list signups and one for SMS signups. The JavaScript in the component then performs validation of the entered data (including formatting the phone number while it's being entered) and then sends all of the data to the AJAXProcessServlet, which I also wrote. Forgive the less than DRY code in the servlet - I had to get it finished under a very tight deadline.

As you can probably tell, this code is not very flexible, owing (again) to the very tight turnaround time. Given my druthers, I'd refactor it to make it smart enough to deal with required fields without all of the hardcoding.
