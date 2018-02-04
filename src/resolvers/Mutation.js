const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { APP_SECRET, getUserId } = require("../utils");

async function vote(parent, { linkId }, ctx, info) {
  const userId = getUserId(ctx);
  const linkExists = await ctx.db.exists.Vote({
    user: { id: userId },
    link: { id: linkId }
  });

  if (linkExists) {
    throw new Error(`Already voted for link: ${linkId}`);
  }

  return ctx.db.mutation.createVote(
    {
      data: {
        user: { connect: { id: userId } },
        link: { connect: { id: linkId } }
      }
    },
    info
  );
}

function post(parent, { url, description }, ctx, info) {
  const userId = getUserId(ctx);
  return ctx.db.mutation.createLink({
    data: {
      url,
      description,
      postedBy: {
        connect: {
          id: userId
        }
      }
    }
  });
}

async function signup(parent, args, ctx, info) {
  const password = await bcrypt.hash(args.password, 10);
  const user = await ctx.db.mutation.createUser({
    data: { ...args, password }
  });

  const token = jwt.sign({ userId: user.id }, APP_SECRET);

  return {
    token,
    user
  };
}

async function login(parent, args, ctx, info) {
  const user = await ctx.db.query.user({ where: { email: args.email } });
  if (!user) {
    throw new Error(`Could not find user with emial: ${args.email}`);
  }

  const valid = await bcrypt.compare(args.password, user.password);
  if (!valid) {
    throw new Error("Invalid password");
  }

  const token = jwt.sign({ userId: user.id }, APP_SECRET);

  return {
    token,
    user
  };
}

module.exports = {
  post,
  signup,
  login,
  vote
};
