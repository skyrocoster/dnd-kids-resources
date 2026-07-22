# Why This Project Exists

**What this is:** a reference document for me, written in plain language, about *why* I am building
this and what I am trying to achieve. It is not a plan, not a spec, and not a roadmap. There are no
stages, no features, and no implementation here.

**What it is for:** re-reading when I am about to build something and I am not sure whether it earns
its place. Most of the arguments below are restrictive — they exist to stop things being built as
much as to justify things being built.

**Who it is for:** me. It should be readable by a stranger, but it is not addressed to one. There is
no pitch voice in it.

---

## The short version

I want to play long-form imaginative games with my four-year-old and my six-year-old. They are ready
for it. D&D is the right vehicle. The tooling for running it with children this age does not exist,
so I am building it.

The whole project is one sentence:

> **Give each child the information they need to make their own decisions, without moving the game
> off the table.**

Everything else in this document is either an argument for that sentence or a constraint on how it
gets satisfied.

---

## Where this came from

This did not start as software. It started as paper.

I printed character sheets. I made spell cards they could hold. It was the obvious thing to do and it
is what most people do, and it failed for three specific reasons that are worth remembering, because
they are the reasons the app exists at all:

- **It was rigid.** Giving something to a character, or taking something away, meant reprinting. So I
  stopped doing it, which meant the game got less flexible to protect the paperwork. That is exactly
  backwards.
- **It went stale.** Anything I changed had to be changed again on paper, or the paper started lying.
- **It cost attention.** This is the one that mattered most. A child reading a spell card is a child
  who has *flipped away* from the sheet showing his health and his skills — the things he needs right
  now, this second. Every lookup pulled him out of the game and out of his own character.

So paper lost at content. But paper did not lose at everything, and the split is worth being precise
about, because it is the whole architecture of what I am building:

| | paper | app |
|---|---|---|
| **HP, skills, the right-now state** | wins — instant, visible, trusted | loses |
| **Spells, weapons, monsters, the world** | loses — rigid, stale, requires flipping | wins |

That is not a philosophical position I arrived at. It is the verdict of a failed experiment.

The response was to build the content layer first: every spell, every monster, every weapon, every
item, and a way to author dungeons, NPCs and story. That is nearly done. What is next is the part
this document exists to keep honest — **slicing that content back out to the children in a way that
doesn't break the flow of the game.**

---

## The ethos underneath all of it

If there is only one thing here, it is this.

### Take them seriously

Children are not small, stupid adults. They are people with enormous imaginations and very little
administration.

So the adjustment is made in exactly one place: **the clerical burden.** They cannot remember a week
back. They cannot hold a floorplan in their heads. They cannot flip to page four while deciding what
to do. They cannot track what they own, who they met, or which door was locked. All of that gets
carried for them, quietly, without ceremony.

**Nothing else is adjusted.** Not the danger. Not the complexity of the fiction. Not the vocabulary.
Not the consequences. Not the possibility of failing badly. They get real spells with real names,
real monsters, real dice, and a world that says no.

A four-year-old learning to read *fire damage* is being handed the actual words. Replacing them with
a picture of a flame would be the insult.

**Their limits are logistical, not imaginative. Design around the first. Never design down to the
second.**

That single rule generates most of the rest of this document, and — more usefully — it *rejects*
things. It rejects simplified vocabulary. It rejects guaranteed wins. It rejects "are you sure?"
hand-holding. It rejects icons that replace words instead of accelerating them. It rejects a map that
tells them where to go next.

---

## Why D&D is good for them

This is the developmental case. It is real, and I believe it, but it is a **justification, not a
design input** — see "What this is not a reason for", further down.

Every children's activity claims imagination, turn-taking and arithmetic. The claim only means
something if it is about what D&D does that the alternatives don't.

### Unbounded input, bounded output

Nothing else has both.

```
                    what they can propose        who decides the outcome
free play           anything                     they do
board game          a fixed menu                 the rules
video game          whatever was programmed      the code
D&D                 ANYTHING                     something outside them
```

In free play, a four-year-old says "I hit the dragon" and the dragon dies, because he is also the
dragon. The imagination is total, and therefore weightless. A board game gives him a genuine verdict
but only lets him propose from a menu. A video game is a bigger menu.

D&D is the only one where he can say *"I climb the bookshelf and drop on the guard"* — a thing no
designer anticipated — and then has to sit there while a d20 tells him whether it worked. The
invention stays his. The outcome stops being his.

Their imagination gets odds.

### The DM supplies the adversity they would never write themselves

"I climb the bookcase." → "The librarian is furious with you."

Children do not put difficulties into their own games. Why would they? Nobody at the table wants to
make it harder for themselves. The dice supply *odds*; the DM supplies *complication*, and
complication is the thing free play structurally cannot produce.

This is why a bit of railroading is an instrument rather than a compromise. It teaches that actions
land in a world that answers back — a structure children do not generate on their own, and which
their own play is missing.

### You have to keep going after it goes wrong

A failed roll in free play does not exist. A failed roll in a board game ends your turn. A failed
roll in D&D means the guard has noticed you, and **you still have to decide what to do next.**

That is improvisation under an adverse outcome you did not choose. I think it is the most valuable
thing on this list and the hardest to get anywhere else.

### It's a structured version of what they already do

They practise imagination more than any adult does. This is not teaching them a new activity — it is
putting rails under one they are already expert at.

### Both of us are actually playing

Children's board games are too easy for adults. The adult performs enjoyment. That is why they die
after a fortnight.

D&D does not have this problem, because I am playing under real odds too. That is not a nice-to-have.
**An activity a parent has to endure does not survive a year of Tuesdays.** The sustainability of the
whole thing rests on this.

### What this is not a reason for

The developmental benefits are real. My four-year-old is learning to read `1d20` and `fire damage`
because he wants to know what his spell does, and that is the most motivated literacy I could
possibly engineer.

**None of that is ever a reason to build a feature.**

The moment enrichment becomes an objective, everything drifts toward things that look educational and
play badly — making them do the arithmetic, making them read the card aloud, making them "learn from"
a failed roll. That is how every educational game ever made turned into homework with a sticker on it.
It is also the same failure as the app adjudicating: it substitutes the adult's agenda for the child's
decision.

These are reasons the game is worth playing. They are arguments I make to other people. **A feature
earns its place by making the game flow better or by handing a decision back to a child — never by
being good for them.** If I can't explain a feature without invoking a benefit, it's homework.

---

## Why it is worth doing

This is the relational case, and it is the root of the project.

The fun for them is not in managing the game. It is in interacting with the game and playing with
Dad. Every minute I spend flicking through a book, or helping a binder get to the right page, is a
minute of *administrator* instead of *Dad*. That is the currency being spent, and it is the currency
every design decision here is trying to protect.

But there are three sharper things underneath it that I had not articulated before writing this down.

### The app makes the world trustworthy independently of me

If I am the only record of what happened, then the world isn't a place — it is an extension of my
memory and my mood. And the children cannot tell the difference between:

- *"You never found that door"* and *"Dad forgot about the door"*
- *"The librarian is still angry"* and *"Dad's not doing that bit tonight"*
- *"There's nothing there"* and *"Dad's tired"*

They will learn, correctly, that outcomes depend on Dad rather than on the world. And that quietly
destroys the developmental case above, because **consequence only teaches anything if consequence is
consistent.** A world that forgets cannot punish or reward.

So the memory features are not convenience for me and they are not note-taking for them. They are
what turns the school from *a thing Dad is doing* into **a place that exists whether or not anyone is
thinking about it.**

The fog is the proof of this. They can see the boundary of what they have earned, so the unrevealed
part is visibly *there and unknown*, rather than *not written yet*.

### It lets me be an ally

Without external arbitration, every imagination game forces the adult into permanent "yes, and…",
because any refusal is *my* refusal. I am the killjoy, every time, personally.

The dice move the odds outside the relationship. A world that remembers moves the facts outside the
relationship. Between them, the "no" stops coming from me.

Which also means I get to be lenient. The app holds the facts I would otherwise have to be rigid
about, so I can be generous when a four-year-old needs me to be. **A DM who is both the record and
the referee has to choose between being fair and being kind.**

I am not the opponent and I am not really the referee. I am the world, plus the person delighted by
what they do to it. The gasp only works because they know I am not out to get them.

### It moves the prompting out of my mouth

The thing I actually want to stop doing is this:

> *"Okay, look, I'll just say this one time — maybe you want to chat to the centaur."*

That sentence costs three things at once. It breaks the fiction. It hands them my idea instead of
theirs. And it makes the interesting thing *Dad's* interesting thing. The centaur they chose to talk
to is a completely different memory from the centaur Dad told them to talk to.

So the map is not only a record. It is **a quest board that nobody had to write.** The chest they
found and didn't open is still sitting there. The corridor they glanced down. The teacher they met
and didn't help. Unfinished business generates its own pull, and no one authored the nudge — it is
just a consequence of what they did.

---

## Why D&D 5e, kept whole

I picked 5e because I know the rules. That is the honest answer and it shouldn't be dressed up as
anything else. But what justifies *staying* on it is different from what made me pick it.

### The rules were always the disposable part

Most of them are already gone. Spells are not locked behind classes. Health is inflated to around a
hundred. Levels are gone in favour of simply giving them more powerful things and pointing more
powerful things at them. Combat restrictions — the five-foot rule for casting, and so on — are gone.

What I kept was the **content** and the **d20**.

Which is the point: lightweight children's TTRPG systems give you simple rules and an empty world,
where the parent has to invent every monster, spell and item. 5e gives an enormous pre-authored field
of possibility that no parent could write in a lifetime, and its rules are the throwaway layer.

**The game is not simplified. The access to it is.**

### It gives me a deep well of potential

This connects directly to the thing I actually enjoy: I like modelling the potential. I have no
interest in the set piece.

2,700 monsters is not completionism. It is raw material — so when a six-year-old asks what is behind
the door, the answer already exists and I am *choosing* rather than *inventing*. The catalogues are
the well.

### Other reasons it stays

- **No ceiling.** This is meant to run for years. A three-stat homebrew system is outgrown by eight.
  5e is still there at fourteen, and none of the content needs rewriting when the rules eventually
  tighten up.
- **Nothing to invent under pressure.** My loose rulings sit on top of something that already has an
  answer if I want one. Homebrew means being the system *and* the world, mid-session, at bedtime.
- **The dice are objects.** Kids love the weird dice. That is the same reason the figures stay on the
  table — see the next section.
- **It is the grammar of RPGs.** Stats, rolls, HP, saves. This is the substrate under every video game
  RPG they will ever touch. Learning D&D at six is learning to read the genre.
- **It's the real one.** A child knows the difference between playing D&D and playing a version of
  D&D made for children.

### The medium is repairable in flight

If I get the mood wrong, I can drop in a funny character. If I misjudge a fight, the goblins get
scared and run. No video game and no board game can be repaired mid-play. With a four- and a
six-year-old — where I genuinely cannot predict what will land — that is not a convenience. It is
what makes the whole thing viable.

It is also the strongest argument against the app ever enforcing anything. **A system that knows the
rules will hold me to them at exactly the moment I need to break them.**

---

## What was wrong with the alternatives

This is first-hand only. I have not tried the children's TTRPG products, so I am not making claims
about them.

**I tried a VTT first, and it failed for a specific, observable reason: the children became
spectators.** The DM turns into the operator of the game and the kids sit and watch him fiddle. It
lacked authenticity — they could tell they were watching rather than playing. That is the same agency
failure as me telling them to go and talk to the centaur, arriving through a different door.

**Then I took it to the table, and the table was right — but there was nothing behind it.** I ended up
writing a pile of Google Docs, or getting into complicated worldbuilding tools that are built for
novelists rather than for a bloke running a game on a Tuesday.

So the project sits in a gap I actually stood in: *the table is correct, and there is no tooling
designed to sit behind a table where one adult carries all the rules and the players structurally
cannot carry their own state.*

---

## The constraint: the table is where the game is played

This is the hard boundary and it is not negotiable.

> **The table is where the game is *played*. Screens are where it is *consulted*.**

A screen can be *better* at something and still be excluded, because that something is play. A
virtual battle map is genuinely superior on capability — dynamic lighting, line of sight, automatic
fog. It is excluded anyway, for reasons that have nothing to do with capability:

- **Tactile.** Physically moving your own figure, which is researched as mattering for children.
- **One shared object.** Everyone attends to *the same thing*, rather than each person looking at
  their own screen with their own token on it.
- **Dice in the open.** The roll happens in the room, in real time, where everybody sees it.

And the single best argument for all of it:

> **A child sees your hand move toward the monster next to their figure and gasps — before you have
> said a word. They know something is about to happen. That gasp does not exist in a VTT.**

Which means the exclusions are not restraint or scope-cutting. **They are enforcement.** If I build a
good enough digital position tracker, the table quietly stops being where the game is. Leaving it out
is load-bearing.

The same test explains why the encounter tracker *is* allowed on a screen: monster HP and initiative
order are my bookkeeping, not the children's shared experience. Nobody loses co-presence when I
re-order initiative on a laptop, and mid-fight changes — three more goblins because they killed the
first lot too quickly — are expensive on paper and cheap on screen.

### Where things sit

```
BETWEEN SESSIONS   authoring, worldbuilding, the Loom, Map Lab, catalogues
IN SESSION · me    quick reference, plus the mutations that are expensive on paper
IN SESSION · kids  one question, answered, device down
NEVER              anything that would pull play off the table —
                   battle maps, position tracking, HP, slots, dice rolling
```

"Not staring at screens" never meant minimising screens. I am not frightened of screens. It means
**the screen must never become the game.** The metric was never screen time — it is attention
capture. They pick the device up to make a decision and put it down once it is made.

---

## What the app is actually for

### It absorbs labour. It never absorbs creativity.

This is the dividing line, and it is visible in what I have already built.

Clerical work goes to the machine: statblocks, continuity, bookkeeping, map drawing, remembering who
was angry. Craft stays with me: story, structure, possibility.

I do not enjoy writing statblocks — hence pulling monsters as templates. I do not enjoy drawing maps —
hence an SVG cell grid rather than an illustration tool. Neither of those was a pragmatic shortcut.
They are the principle in action.

**I like modelling the potential. I have no interest in the set piece.**

That is also why fog, the whole-school map and dungeon connections exist while a battle map does not.
Fog is potential space. A battle map is the purest set piece there is.

The tools do not exist to make me efficient. They exist to **equip me to do the parts I actually want
to do**, by clearing away the parts I don't.

### It informs. It never adjudicates.

The app holds *reference*. I hold the *ruling*.

If it ever starts enforcing rules, it replaces the loose adjudication that makes 5e playable for a
four-year-old at all, and it removes the fudge that keeps the evening recoverable. This is the real
reason there is no dice roller, no slot tracking, no HP tracking — deeper than "the binder is faster".

### It provides dials, not opinions.

How much shows, how fast, how loud, how many icons — those are DM decisions made at the table and
re-made every session, tuned to *these* children. Someone else's children would give different
results.

The app does not encode a pedagogy. It encodes capability, and a human turns it up or down. That is
also the honest reason nothing is hardcoded: **the tuning happens at play time, not at build time**,
so the code is not entitled to hold an opinion about it.

### The game is playable without any of it.

The app is an amplifier, not a dependency. Laptop dies, Tuesday still happens.

---

## The bet

My design assumes investigators. Fog, a knowledge ratchet, a key found three weeks ago fitting a
chest, a librarian who remembers she is angry.

My players fight everything that walks. Kids are murder hobos too.

That looks like a contradiction, and the honest framing is that the whole project is a bet on why:

```
combat          needs   nothing.  the monster is in front of you, right now
exploration     needs   a map, and memory of where you haven't been
social          needs   who this is, what you said last time, who is angry
investigation   needs   the key, the locked door, the thing you noticed weeks ago
```

**Combat is the only verb available to a player with no memory.** Every other mode of play is gated
behind continuity a four-year-old cannot hold. So of course they fight everything — it is the only
door that opens without a key.

> **Hypothesis: they fight everything because fighting is the only mode that does not require memory.
> Give them the memory and the other modes become available.**

That is falsifiable, and it tells me exactly what to watch for at the table. Not "did they use the
map" — **did a new verb appear.** Did anyone go *back* somewhere. Did anyone ask about a person by
name. Did anyone try the key.

If I build the whole knowledge model and they still open with "I attack it", the hypothesis was
wrong: they are murder hobos because being a murder hobo at six is brilliant fun, and the map is a
lovely answer to a question nobody at my table is asking.

### The real motivation problem is smaller than I thought

Fog already works. *"Oooo, you don't know what's there"* is free with children — it is sweets. Getting
them into a room is not the problem.

The problem is one level in: **getting them to hold a detail in mind long enough to ask why it was
mentioned.** Why did Dad say the painting was fancy? Why the creaky floorboard?

That is a convention they have not learned yet. In free play, mentioned detail is scenery. In an
adventure, mentioned detail is a *promise*. Nobody has told them that, and it cannot really be told —
it has to be experienced enough times to become an instinct.

A spoken detail is the worst possible vehicle for it, because it evaporates in about nine seconds
inside a four-year-old's head. He cannot interrogate the painting later, because by later there is no
painting.

So the mechanism is:

> **A narrated detail becomes a durable object. The sentence stops being weather and starts being
> furniture.** The painting sits there, noticed and unexamined, until the thought arrives — and the
> thought is allowed to arrive twenty minutes late.

The map filling in is also, in itself, a reason to explore. Icons appearing is a reward loop, and an
honest one, because the reward *is* the thing — you now know something — rather than points bolted on
top.

And memory fails at an hour, not just at a week. A locked chest found at 6:15 is gone by 7:15. The
app has to be useful *within* a session, not only as a bridge between them.

---

## Rules that fall out of all this

**The map may shout about what they know. It must never whisper about what they don't.**

```
LOUD    the chest you found and didn't open
        the door you found locked
        the corridor you looked down and didn't walk
        the centaur you met and didn't talk to
                                        ← all earned, all honest, all pulling

SILENT  "something interesting is over there"
        a marker on a room they have never entered
        anything that says LOOK HERE about the unknown
                                        ← that is Dad's voice wearing a costume
```

There is no conflict between the ratchet and motivation. Unfinished business is made entirely of
things they already know, so the ratchet is not a constraint on the pull — it is the *source* of it.
And it is the stronger pull anyway: a chest you personally found and couldn't open is a far worse itch
than a vague marker somewhere you have never been.

**Their words go on the map.**

They will name things. The centaur becomes Clip-Clop, the storeroom full of bones becomes "the bone
room". This has already happened at my table, with horses. That naming is the clearest evidence there
is that a place has become theirs — and if every label on the map is mine, then the map is a thing Dad
made *for* them, not a record of what they did.

The player side stays read-only; that is architecture. But read-only is a statement about *which
device writes*, not about *whose language ends up in the world*. I have a keyboard. I can type "the
bone room" in four seconds because a six-year-old said it.

**Icons are about speed, not literacy.**

A repeated symbol is recognised faster than a word by *everyone* at the
table — that is what gets the device put back down. Text stays. D&D's text is unusually patterned
(`1d20`, "fire damage", "make an attack roll") and it recurs enough that a four-year-old learns to
read it the way he learns to read cereal boxes. **Passive reading is a benefit of the design, not a
tax on it.** Iconography is a consistent visual language layered *on* the text, not a replacement for
it.

---

## What is at stake at the table

Death is on the table but extremely unlikely. I do not intend to kill them unless it goes horribly
wrong.

The inflated health is *not* a statement about stakes — it is a workaround for a pacing problem I
have not solved. They fight everything that walks, and I do not yet have a decent answer to the
rest-and-recovery economy, so at real 5e numbers they would die instantly. The big number papers over
it. That is an open rules problem, and it will still be there when the rules eventually firm up.

Everything else that can go wrong stays. The librarian is furious. The door stayed shut and you went
the long way. The teacher you were trying to help got taken anyway. You never found the thing in the
drawer. The dog got away.

Those are failures a six-year-old can metabolise and keep playing through, which is exactly the
"continuation" mechanism above. Character death is the one failure that ends continuation.

And it means **the app is the thing that makes failure count.** A bad roll at 7pm on a Tuesday only
means anything if it is still true next Tuesday. Without persistence, every failure gets quietly
forgiven by forgetting — and then there were never any stakes at all, whatever the dice said.

---

## The record

This is an operational tool that is quietly producing a record of my children's childhood. The Loom
holds the story beats against the sessions they happened in. The map holds what they knew and when
they knew it.

The posture is: **preserve, don't commemorate.**

**Don't commemorate.** No timeline view, no "campaign so far" export, no session recaps, no scrapbook.
Every one of those fails the test — it doesn't change a Tuesday. Review tools will come later, and
they need a full, real dataset first. Building them now would be building for a nostalgic adult, which
is a different product.

**Don't destroy.** Nearly free now, impossible to recover later. Be suspicious of anything that
erases: resets to authored defaults, hard deletes, "start a new campaign" primitives that clear rather
than branch, reusing a dungeon by wiping its fog instead of copying it. The knowledge ratchet already
gets this right by only ever going forward; that instinct should apply everywhere. **This database is
the only copy of something that cannot be re-run.**

**And the record must be sufficient, not merely intact.** Long term I would like to be able to write
stories out of these campaigns. The *writing* is off-world — the tool never tries to tell the story,
and nobody is looking for great prose out of a database. But it has to leave behind enough that
someone could. The test: *could a reader reconstruct what happened on a given Tuesday from what is
stored?* If the answer is "only if Dad is alive to explain it", the record is too thin.

There is a version of this that is not sentimental at all, which is why it stays: the record is what
makes the *game* work. A world that remembers, and a school that filled in over two years, are the
same object. I don't need a commemorative feature. I just need to never throw anything away, and the
memento assembles itself.

Then in ten years I open it and there is the bone room, still called the bone room.

---

## Scope

**This is personal.** One family, one campaign, one database. There are no users, no accounts, no
campaigns and no owners in the schema, and that absence is load-bearing — it is why there is no login,
why a profile picker is enough, why polling beats push, why concealment is a curtain rather than a
wall.

If anyone else ever wants it, they clone the repo and bring their own data. Most of the seeds aren't
mine to redistribute anyway.

Nothing is hardcoded, but that is ordinary hygiene plus the "dials, not opinions" principle — not a
hedge toward productisation. If I ever wanted multi-campaign or multi-tenant, that is a rewrite, and
worrying about it now would buy nothing except the illusion of having prepared.

Building for two named children is what makes the design *decidable*. "Kids" is not a specification.
A four-year-old learning to read and a six-year-old who reads fluently is.

---

## What I am watching for

The signals that tell me whether any of this is working:

- **Did a new verb appear?** Someone going back somewhere. Someone asking about a person by name.
  Someone trying the key. This is the bet, and it is the main thing.
- **Did the device go back down?** If they are browsing rather than deciding, the surface is wrong.
- **Am I still saying "maybe you want to talk to the centaur"?** If so, the prompting has not moved
  into the world.
- **Did they interrogate a detail I mentioned?** The painting, the floorboard. That is the convention
  landing.
- **Am I reaching for a book?** That is the original problem, unsolved.

---

## Open questions

Genuinely unresolved. Not decisions being deferred — things I cannot know without playing.

- **Does the kid-facing side outlive their needing it?** Much of it is scaffolding for capabilities
  they are actively acquiring — reading, retention, spatial modelling. If the ten-year-old stops
  opening the tablet because he simply *remembers*, that is success, not failure. The DM side looks
  permanent; the kid side may be a ladder built to be climbed and left behind. Which argues for
  building it **soon rather than beautifully** — a four-year-old who cannot read is a depreciating
  specification.
- **Do they ever put in something that isn't a name?** A drawing of the monster, appearing beside the
  room where they fought it. That breaks read-only properly and it is an emotional decision rather
  than a design one. Probably obvious when the moment arrives.
- **The recovery and attrition economy.** Inflated HP is a workaround, not an answer.
- **How much to show, and how fast.** A dial, tuned by playtest, against my children specifically.
