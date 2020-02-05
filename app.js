const express = require('express');
const cors = require('cors');
const app = express();

app.use(express.json());
app.use(cors());
app.use(express.static('public'));

app.locals.title = 'Projects';
app.locals.id = 0;

const environment = process.env.NODE_ENV || 'development'
const configuration = require('./knexfile')[environment]
const database = require('knex')(configuration)

app.get('/api/v1/projects', async (request, response) => {
  try {
    const projects = await database('projects').select();
    response.status(200).json({projects})
  } catch (error) {
    response.status(500).json({error})
  }
});

app.get('/api/v1/palettes/:id', async (request, response) => {
  const { id } = request.params;
  try {
    const palettes = await database('palettes').where('id', id);
    if (palettes.length) {
      response.status(200).json(palettes[0])
    } else {
      response.status(404).json(
        {error: `Could not find palette with an id of ${id}`})
    }
  } catch (error) {
    response.status(500).json({ error })
  }
});

app.post('/api/v1/projects/:id/palettes', async (request, response) => {
  const projects_id = request.params.id;
  const palette = { ...request.body, projects_id: Number(projects_id) };

  for (let requiredParameter of ['name', 'color_one', 'color_two',
    'color_three', 'color_four', 'color_five', 'projects_id']) {
    if (!palette.hasOwnProperty(requiredParameter)) {
      return response
        .status(422)
        .send({ error: `Expected body format is: { name: <String>, color_one: <String>, color_two: <String>, color_three: <String>, color_four: <String>, color_five: <String> }. You\'re missing the required "${requiredParameter}" property.` })
    }
  }
  try {
    const id = await database('palettes').insert(palette, 'id');
    response.status(201).json({ id: id[0] });
  } catch (error) {
    response.status(500).json({ error });
  }
});

app.post('/api/v1/projects', async (request, response) => {
  const project = request.body;
  if (!project.name) {
    return response.status(422).json({error: 'Expected body format {name: <String>}. You\'re missing the required name property'});
  }
  try {
    const id = await database('projects').insert(project, 'id');
    response.status(201).json({ id: id[0] });
  } catch (error) {
      response.status(500).json({error});
  }
});

app.delete('/api/v1/palettes/:id', async (request, response) => {
  const palettes_id = request.params.id;
  try {
    const found = await database('palettes').where('id', palettes_id);
    if (found.length) {
      const id = await database('palettes').where('id', palettes_id).del();
      response.status(200).send(`Palette with id ${palettes_id} has been removed successfully`);
    } else {
      response.status(404).json({
        error: `Could not find palette with an id of ${palettes_id}`
      })
    }
  } catch (error) {
    response.status(500).json({ error });
  }
});

module.exports = app;
