const {
  promisify
} = require('util');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const passport = require('passport');
const _ = require('lodash');
const User = require('../models/User');

const randomBytesAsync = promisify(crypto.randomBytes);

/**
 * GET /login
 * Login page.
 */
exports.getLogin = (req, res) => {
  if (req.user) {
    return res.redirect('/webrec');
  }
  res.render('account/login', {
    title: req.__('login')
  });
};

/**
 * POST /login
 * Sign in using email and password.
 */
exports.postLogin = (req, res, next) => {
  req.assert('email', req.__('Email is not valid')).isEmail();
  req.assert('password', req.__('Password cannot be blank')).notEmpty();
  req.sanitize('email').normalizeEmail({
    gmail_remove_dots: false
  });

  const errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('/webrec/login');
  }

  passport.authenticate('local', (err, user, info) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      req.flash('errors', {
        msg: req.__('The e-mail address or password is incorrect.')
      });
      // req.flash('errors', req.__(info));
      return res.redirect('/webrec/login');
    }
    req.logIn(user, (err) => {
      if (err) {
        return next(err);
      }
      req.flash('success', {
        msg: req.__('Success! You are logged in.')
      });
      res.redirect('/webrec');
    });
  })(req, res, next);
};

/**
 * GET /logout
 * Log out.
 */
exports.logout = (req, res) => {
  req.logout();
  req.session.destroy((err) => {
    if (err) console.log('Error : Failed to destroy the session during logout.', err);
    req.user = null;
    res.redirect('/webrec');
  });
};

/**
 * GET /signup
 * Signup page.
 */
exports.getSignup = (req, res) => {
  if (req.user) {
    return res.redirect('/webrec');
  }
  const currentYear = new Date().getFullYear();
  const latest80Years = [];
  for (let i = currentYear - 80; i < currentYear; i++) {
    latest80Years.push(i);
  }
  res.render('account/signup', {
    title: req.__('create_account'),
    genders: [req.__('Male'), req.__('Female'), req.__('Other')],
    birthyears: latest80Years,
    proficiency_levels: [req.__('Never'), req.__('Intermediate'), req.__('Advanced')],
    usertypes: [req.__('Speaker'), req.__('Researcher')],
    name_placeholder: req.__('Name must be at least 4 characters long'),
    password_placeholder: req.__('Password must be at least 4 characters long')
  });
};

/**
 * POST /signup
 * Create a new local account.
 */
exports.postSignup = (req, res, next) => {
  req.assert('email', req.__('Email is not valid')).isEmail();
  req.assert('gender', req.__('Gender cannot be blank')).notEmpty();
  req.assert('usertype', req.__('Usertype cannot be blank')).notEmpty();
  req.assert('name', req.__('Name must be at least 4 characters long')).len(4);
  req.assert('password', req.__('Password must be at least 4 characters long')).len(4);
  req.assert('confirmPassword', req.__('Passwords do not match')).equals(req.body.password);
  req.sanitize('email').normalizeEmail({
    gmail_remove_dots: false
  });

  const errors = req.validationErrors();
  console.log(errors);

  if (errors) {
    console.log('abc');
    req.flash('errors', errors);
    //return res.redirect('/signup');
    const currentYear = new Date().getFullYear();
    const latest80Years = [];
    for (let i = currentYear - 80; i < currentYear; i++) {
      latest80Years.push(i);
    }
    return res.render('account/signup', {
      title: req.__('create_account'),
      genders: [req.__('Male'), req.__('Female'), req.__('Other')],
      birthyears: latest80Years,
      proficiency_levels: [req.__('Never'), req.__('Intermediate'), req.__('Advanced')],
      usertypes: [req.__('Speaker'), req.__('Researcher')],
      email: req.body.email,
      name: req.body.name,
      gender_selected: req.body.gender,
      usertype_selected: req.body.usertype,
      birthplace_selected: req.body.birthplace,
      residence_selected: req.body.residence,
      profession_selected: req.body.profession,
      birthyear_selected: req.body.birthyear,
      proficiency_level_selected: req.body.proficiency
    });
  }


  const signup = () =>
    User
    .findOne({
      $or: [{
        email: req.body.email
      }, {
        'profile.name': req.body.name
      }]
    })
    .then((existingUser) => {
      if (existingUser) {
        const errors = [];
        if (existingUser.email === req.body.email) {
          errors.push({
            msg: 'Account with that email address already exists.'
          });
        }
        if (existingUser.profile.name === req.body.name) {
          errors.push({
            msg: 'Account with that name already exists.'
          });
        }
        req.flash('errors', errors);
        throw res.redirect('/webrec/signup');
      }
      const user = new User({
        email: req.body.email,
        password: req.body.password,
        profile: {
          name: req.body.name,
          gender: req.body.gender,
          birthplace: req.body.birthplace,
          residence: req.body.residence,
          profession: req.body.profession,
          birthyear: req.body.birthyear,
          proficiency: req.body.proficiency,
          usertype: req.body.usertype
        }
      });
      user.save((err) => {
        if (err) {
          return next(err);
        }
        req.logIn(user, (err) => {
          if (err) {
            return next(err);
          }
        });
      });
      return user;
    });

  const sendSignupMail = (user) => {
    // if (!user) { return; }
    let transporter = nodemailer.createTransport({
      service: 'SendGrid',
      auth: {
        user: process.env.SENDGRID_USER,
        pass: process.env.SENDGRID_PASSWORD
      }
    });
    const locale = req.getLocale();
    let mailOptions;
    if (locale === 'ja') {
      mailOptions = {
        to: user.email,
        from: 'noreply@webrec.com',
        subject: '??????????????????????????????????????????',
        text: `${user.profile.name}???\n\n???????????????Webrec?????????????????????????????????????????????????????????????????????????????????????????????????????????\n\n?????????????????????: ${user.email}\n??????: ${user.profile.name}\n???????????????: ${user.password}\n\n?????????????????????????????????????????????????????????: http://${req.headers.host}/account\n\n`
      };
    } else if (locale === 'en') {
      mailOptions = {
        to: user.email,
        from: 'noreply@webrec.com',
        subject: 'Welcome to Webrec',
        text: `Hello, ${user.profile.name}\n\nWe're very excited that you have signed up for Webrec.\n\nYour account information\n\nE-mail: ${user.email}\nUsername: ${user.profile.name}\n Password: ${user.password}\n\nYou can change your account information via: http://${req.headers.host}/account\n\n`
      };
    }
    return transporter.sendMail(mailOptions)
      .then(() => {
        req.flash('success', {
          msg: req.__('Success! We have sent you an e-mail.')
        });
      })
      .catch((err) => {
        if (err.message === 'self signed certificate in certificate chain') {
          console.log('WARNING: Self signed certificate in certificate chain. Retrying with the self signed certificate. Use a valid certificate if in production.');
          transporter = nodemailer.createTransport({
            service: 'SendGrid',
            auth: {
              user: process.env.SENDGRID_USER,
              pass: process.env.SENDGRID_PASSWORD
            },
            tls: {
              rejectUnauthorized: false
            }
          });
          return transporter.sendMail(mailOptions)
            .then(() => {
              req.flash('success', {
                msg: req.__('Success! Your password has been changed.')
              });
            });
        }
        console.log('ERROR: Could not send password reset confirmation email after security downgrade.\n', err);
        req.flash('warning', {
          msg: req.__('Your password has been changed, however we were unable to send you a confirmation email. We will be looking into it shortly.')
        });
        return err;
      });
  };

  signup()
    .then(sendSignupMail)
    .then(() => {
      if (!res.finished) res.redirect('/webrec');
    })
    .catch(err => next(err));
};

/**
 * GET /account
 * Profile page.
 */
exports.getAccount = (req, res) => {
  const currentYear = new Date().getFullYear();
  const latest80Years = [];
  for (let i = currentYear - 80; i < currentYear; i++) {
    latest80Years.push(i);
  }
  res.render('account/profile', {
    title: req.__('account_management'),
    prefectures: ['?????????', '?????????', '?????????', '?????????', '?????????', '?????????', '?????????', '?????????', '?????????', '?????????', '?????????', '?????????', '?????????', '????????????', '?????????', '?????????', '?????????', '?????????', '?????????', '?????????', '?????????', '?????????', '?????????', '?????????', '?????????', '?????????', '?????????', '?????????', '?????????', '????????????', '?????????', '?????????', '?????????', '?????????', '?????????', '?????????', '?????????', '?????????', '?????????', '?????????', '?????????', '?????????', '?????????', '?????????', '?????????', '????????????', '?????????'],
    professions: ['?????????', '??????????????????', '?????????', '?????????', '?????????', '????????????', '???????????????????????????', '??????', '?????????'],
    birthyears: latest80Years,
    proficiency_levels: [req.__('Never'), req.__('Intermediate'), req.__('Advanced')]
  });
};

/**
 * POST /account/profile
 * Update profile information.
 */
exports.postUpdateProfile = (req, res, next) => {
  req.assert('email', 'Please enter a valid email address.').isEmail();
  req.sanitize('email').normalizeEmail({
    gmail_remove_dots: false
  });

  const errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('/webrec/account');
  }

  User.findById(req.user.id, (err, user) => {
    if (err) {
      return next(err);
    }
    user.email = req.body.email || '';
    user.profile.name = req.body.name || '';
    user.profile.gender = req.body.gender || '';
    user.profile.birthplace = req.body.birthplace || '';
    user.profile.residence = req.body.residence || '';
    user.profile.profession = req.body.profession || '';
    user.profile.birthyear = req.body.birthyear || '';
    user.profile.proficiency = req.body.proficiency || '';
    user.save((err) => {
      if (err) {
        if (err.code === 11000) {
          req.flash('errors', {
            msg: req.__('The email address you have entered is already associated with an account.')
          });
          return res.redirect('/webrec/account');
        }
        return next(err);
      }
      req.flash('success', {
        msg: req.__('Profile information has been updated.')
      });
      res.redirect('/webrec/account');
    });
  });
};

/**
 * POST /account/password
 * Update current password.
 */
exports.postUpdatePassword = (req, res, next) => {
  req.assert('password', 'Password must be at least 4 characters long').len(4);
  req.assert('confirmPassword', 'Passwords do not match').equals(req.body.password);

  const errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('/webrec/account');
  }

  User.findById(req.user.id, (err, user) => {
    if (err) {
      return next(err);
    }
    user.password = req.body.password;
    user.save((err) => {
      if (err) {
        return next(err);
      }
      req.flash('success', {
        msg: req.__('Password has been changed.')
      });
      res.redirect('/webrec/account');
    });
  });
};

/**
 * POST /account/delete
 * Delete user account.
 */
exports.postDeleteAccount = (req, res, next) => {
  User.deleteOne({
    _id: req.user.id
  }, (err) => {
    if (err) {
      return next(err);
    }
    req.logout();
    req.flash('info', {
      msg: req.__('Your account has been deleted.')
    });
    res.redirect('/webrec');
  });
};

/**
 * GET /account/unlink/:provider
 * Unlink OAuth provider.
 */
exports.getOauthUnlink = (req, res, next) => {
  const {
    provider
  } = req.params;
  User.findById(req.user.id, (err, user) => {
    if (err) {
      return next(err);
    }
    user[provider.toLowerCase()] = undefined;
    const tokensWithoutProviderToUnlink = user.tokens.filter(token =>
      token.kind !== provider.toLowerCase());
    // Some auth providers do not provide an email address in the user profile.
    // As a result, we need to verify that unlinking the provider is safe by ensuring
    // that another login method exists.
    if (
      !(user.email && user.password) &&
      tokensWithoutProviderToUnlink.length === 0
    ) {
      req.flash('errors', {
        msg: `The ${_.startCase(_.toLower(provider))} account cannot be unlinked without another form of login enabled.` +
          ' Please link another account or add an email address and password.'
      });
      return res.redirect('/webrec/account');
    }
    user.tokens = tokensWithoutProviderToUnlink;
    user.save((err) => {
      if (err) {
        return next(err);
      }
      req.flash('info', {
        msg: `${_.startCase(_.toLower(provider))} account has been unlinked.`
      });
      res.redirect('/webrec/account');
    });
  });
};

/**
 * GET /reset/:token
 * Reset Password page.
 */
exports.getReset = (req, res, next) => {
  if (req.isAuthenticated()) {
    return res.redirect('/webrec');
  }
  User
    .findOne({
      passwordResetToken: req.params.token
    })
    .where('passwordResetExpires').gt(Date.now())
    .exec((err, user) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        req.flash('errors', {
          msg: req.__('Password reset token is invalid or has expired.')
        });
        return res.redirect('/webrec/forgot');
      }
      res.render('account/reset', {
        title: req.__('password_reset')
      });
    });
};

/**
 * POST /reset/:token
 * Process the reset password request.
 */
exports.postReset = (req, res, next) => {
  req.assert('password', 'Password must be at least 4 characters long.').len(4);
  req.assert('confirm', 'Passwords must match.').equals(req.body.password);

  const errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('back');
  }

  const resetPassword = () =>
    User
    .findOne({
      passwordResetToken: req.params.token
    })
    .where('passwordResetExpires').gt(Date.now())
    .then((user) => {
      if (!user) {
        req.flash('errors', {
          msg: req.__('Password reset token is invalid or has expired.')
        });
        return res.redirect('back');
      }
      user.password = req.body.password;
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      return user.save().then(() => new Promise((resolve, reject) => {
        req.logIn(user, (err) => {
          if (err) {
            return reject(err);
          }
          resolve(user);
        });
      }));
    });

  const sendResetPasswordEmail = (user) => {
    if (!user) {
      return;
    }
    let transporter = nodemailer.createTransport({
      service: 'SendGrid',
      auth: {
        user: process.env.SENDGRID_USER,
        pass: process.env.SENDGRID_PASSWORD
      }
    });
    const locale = req.getLocale();
    let mailOptions;
    if (locale === 'ja') {
      mailOptions = {
        to: user.email,
        from: 'noreply@webrec.com',
        subject: '?????????????????????????????????????????????',
        text: `??????????????????\n\n???????????????????????????${user.email}??????????????????????????????????????????????????????????????????????????????\n`
      };
    } else if (locale === 'en') {
      mailOptions = {
        to: user.email,
        from: 'noreply@webrec.com',
        subject: 'Your Hackathon Starter password has been changed',
        text: `Hello,\n\nThis is a confirmation that the password for your account ${user.email} has just been changed.\n`
      };
    }
    return transporter.sendMail(mailOptions)
      .then(() => {
        req.flash('success', {
          msg: req.__('Success! Your password has been changed.')
        });
      })
      .catch((err) => {
        if (err.message === 'self signed certificate in certificate chain') {
          console.log('WARNING: Self signed certificate in certificate chain. Retrying with the self signed certificate. Use a valid certificate if in production.');
          transporter = nodemailer.createTransport({
            service: 'SendGrid',
            auth: {
              user: process.env.SENDGRID_USER,
              pass: process.env.SENDGRID_PASSWORD
            },
            tls: {
              rejectUnauthorized: false
            }
          });
          return transporter.sendMail(mailOptions)
            .then(() => {
              req.flash('success', {
                msg: req.__('Success! Your password has been changed.')
              });
            });
        }
        console.log('ERROR: Could not send password reset confirmation email after security downgrade.\n', err);
        req.flash('warning', {
          msg: req.__('Your password has been changed, however we were unable to send you a confirmation email. We will be looking into it shortly.')
        });
        return err;
      });
  };

  resetPassword()
    .then(sendResetPasswordEmail)
    .then(() => {
      if (!res.finished) res.redirect('/webrec');
    })
    .catch(err => next(err));
};

/**
 * GET /forgot
 * Forgot Password page.
 */
exports.getForgot = (req, res) => {
  if (req.isAuthenticated()) {
    return res.redirect('/webrec');
  }
  res.render('account/forgot', {
    title: req.__('forgot_password')
  });
};

/**
 * POST /forgot
 * Create a random token, then the send user an email with a reset link.
 */
exports.postForgot = (req, res, next) => {
  req.assert('email', 'Please enter a valid email address.').isEmail();
  req.sanitize('email').normalizeEmail({
    gmail_remove_dots: false
  });

  const errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('/webrec/forgot');
  }

  const createRandomToken = randomBytesAsync(16)
    .then(buf => buf.toString('hex'));

  const setRandomToken = token =>
    User
    .findOne({
      email: req.body.email
    })
    .then((user) => {
      if (!user) {
        req.flash('errors', {
          msg: req.__('Account with that email address does not exist.')
        });
      } else {
        user.passwordResetToken = token;
        user.passwordResetExpires = Date.now() + 3600000; // 1 hour
        user = user.save();
      }
      return user;
    });

  const sendForgotPasswordEmail = (user) => {
    if (!user) {
      return;
    }
    const token = user.passwordResetToken;
    let transporter = nodemailer.createTransport({
      service: 'SendGrid',
      auth: {
        user: process.env.SENDGRID_USER,
        pass: process.env.SENDGRID_PASSWORD
      }
    });
    const locale = req.getLocale();
    let mailOptions;
    if (locale === 'ja') {
      mailOptions = {
        to: user.email,
        from: 'noreply@webrec.com',
        subject: '[Webrec]?????????????????????????????????????????????',
        text: `???????????????????????????????????????????????????????????????\n\n
          ???????????????????????????????????????????????????????????????:\n\n
          http://${req.headers.host}/reset/${token}\n\n
          ?????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????\n`
      };
    } else if (locale === 'en') {
      mailOptions = {
        to: user.email,
        from: 'noreply@webrec.com',
        subject: 'Reset your password on Webrec',
        text: `You are receiving this email because you (or someone else) have requested the reset of the password for your account.\n\n
          Please click on the following link, or paste this into your browser to complete the process:\n\n
          http://${req.headers.host}/reset/${token}\n\n
          If you did not request this, please ignore this email and your password will remain unchanged.\n`
      };
    }
    return transporter.sendMail(mailOptions)
      .then(() => {
        req.flash('info', {
          msg: req.__('An e-mail has been sent to {{email}} with further instructions.', {
            email: user.email
          })
        });
      })
      .catch((err) => {
        if (err.message === 'self signed certificate in certificate chain') {
          console.log('WARNING: Self signed certificate in certificate chain. Retrying with the self signed certificate. Use a valid certificate if in production.');
          transporter = nodemailer.createTransport({
            service: 'SendGrid',
            auth: {
              user: process.env.SENDGRID_USER,
              pass: process.env.SENDGRID_PASSWORD
            },
            tls: {
              rejectUnauthorized: false
            }
          });
          return transporter.sendMail(mailOptions)
            .then(() => {
              req.flash('info', {
                msg: req.__('An e-mail has been sent to {{email}} with further instructions.', {
                  email: user.email
                })
              });
            });
        }
        console.log('ERROR: Could not send forgot password email after security downgrade.\n', err);
        req.flash('errors', {
          msg: req.__('Error sending the password reset message. Please try again shortly.')
        });
        return err;
      });
  };

  createRandomToken
    .then(setRandomToken)
    .then(sendForgotPasswordEmail)
    .then(() => res.redirect('/webrec/forgot'))
    .catch(next);
};
