const request = require('supertest');
const app = require('./app.js');

const environment = process.env.NODE_ENV || 'development'
const configuration = require('./knexfile')[environment]
const database = require('knex')(configuration)

describe('Server', () => {

  beforeEach(async () => {
    await database.seed.run();
  });

  describe('GET /api/v1/projects', () => {
    it('should return a 200 and all projects', async () => {
      const expectedProjects = await database('projects').select();
      const response = await request(app).get('/api/v1/projects');
      const projects = response.body;
      expect(response.status).toBe(200);
      expect(projects.projects[0].name).toEqual(expectedProjects[0].name );
    });
  });

  describe('GET /api/v1/projects/:id/palettes', () => {
    it('Should return a 200 status and an array of palettes', async () => {
      const { projects_id } = await database('palettes').first();
      const expectedPalettes = await database('palettes').where('projects_id', projects_id);
      const response = await request(app).get(`/api/v1/projects/${projects_id}/palettes`);
      const result = response.body;
      expect(response.status).toBe(200);
      expect(result.palettes[0].name).toEqual(expectedPalettes[0].name);
    });

    it('Should return a 404 status and an error message', async () => {
      const response = await request(app).get(`/api/v1/projects/-100/palettes`);
      const result = response.body;
      expect(response.status).toBe(404);
      expect(result).toEqual({Error: `No palettes could be found matching a project with an id of -100`});
    });
  });

  describe('GET /api/v1/projects/:id', () => {
    it('Should return a 200 status and a project object', async () => {
      const expectedProject = await database('projects').first();
      const { id } = expectedProject;
      const response = await request(app).get(`/api/v1/projects/${id}`);
      const result = response.body;
      expect(response.status).toBe(200);
      expect(result.name).toEqual(expectedProject.name);
    });

    it('Should return a 404 status and an error message if the project is not found', async () => {
      const response = await request(app).get('/api/v1/projects/-100');
      const result = response.body;
      expect(response.status).toBe(404);
      expect(result).toEqual({Error: `No project found with an id of -100`});
    });
  });

  describe('GET /api/v1/palettes/:id', () => {
    it('should return a 200 and single palette', async () => {
      const expectedPalette = await database('palettes').first();
      const { id } = expectedPalette;
      const response = await request(app).get(`/api/v1/palettes/${id}`);
      const result = response.body;
      expect(response.status).toBe(200);
      expect(result.name).toEqual(expectedPalette.name);
    });

    it('should return a 404 if palette does not exist in DB', async () => {
      const invalidId = -11;
      const response = await request(app).get(`/api/v1/palettes/${invalidId}`);
      expect(response.status).toBe(404);
      expect(response.body.error).toEqual(`Could not find palette with an id of ${invalidId}`);
    });
  });

  describe('POST /api/v1/projects', () => {
    it('Should return a 201 status and the project id', async () => {
      const newProject = {name: 'Test Project'};
      const response = await request(app).post('/api/v1/projects').send(newProject);
      const projects = await database('projects').where('id', response.body.id);
      const project = projects[0];
      expect(response.status).toBe(201);
      expect(project.name).toEqual(newProject.name);
    });

    it('Should return a 422 status and an error message if a name property is not included in the request body', async () => {
      const response = await request(app).post('/api/v1/projects').send({});
      expect(response.status).toBe(422);
      expect(response.body.error).toEqual('Expected body format {name: <String>}. You\'re missing the required name property');
    });
  });

  describe('POST /api/v1/projects/:id/palettes', () => {
    it('should return a 201 with the id of the newly created palette',
      async () => {
        const expectedProject = await database('projects').first();
        const { id } = expectedProject;
        const newPalette = {
          name: 'new palette',
          color_one: '#111111',
          color_two: '#222222',
          color_three: '#333333',
          color_four: '#444444',
          color_five: '#555555'
        };
        const response = await request(app).post
          (`/api/v1/projects/${id}/palettes`).send(newPalette);
        const palettes = await database('palettes').where('id', response.body.id);
        const palette = palettes[0];
        expect(response.status).toBe(201);
        expect(palette.name).toEqual(newPalette.name);
    });

    it('should return a 422 if properties are missing from request body',
      async () => {
        const expectedProject = await database('projects').first();
        const { id } = expectedProject;
        const newPalette = {
          color_one: '#111111',
          color_two: '#222222',
          color_three: '#333333',
          color_four: '#444444',
          color_five: '#555555',
          projects_id: id
        };
        const response = await request(app).post
          (`/api/v1/projects/${id}/palettes`).send(newPalette);
        expect(response.status).toBe(422);
        expect(response.body.error).toEqual('Expected body format is: { name: <String>, color_one: <String>, color_two: <String>, color_three: <String>, color_four: <String>, color_five: <String> }. You\'re missing the required "name" property.')
    });
  });

  describe('DELETE /api/v1/projects/:id', () => {
    it('should return a 200 with a success message if delete is successful', async () => {
      const expectedProject = await database('projects').first();
      const { id } = expectedProject;
      const response = await request(app).delete(`/api/v1/projects/${id}`).send(`${id}`);
      const doesExist = await database('projects').where('id', id);
      expect(response.status).toBe(200);
      expect(response.body).toEqual(`Project with id ${id} has been removed successfully`);
      expect(doesExist.length).toEqual(0);
    });

    it('should return a 404 with a not found error message if item to delete does not exist', async () => {
      const invalidId = -5;
      const response = await request(app).delete(`/api/v1/projects/${invalidId}`).send(`${invalidId}`);
      expect(response.status).toBe(404);
      expect(response.body.error).toEqual(`Could not find project with an id of ${invalidId}`);
    });
  });

  describe('DELETE /api/v1/palettes/:id', () => {
    it('should return a 200 with a success message if delete is successful', async () => {
      const expectedPalette = await database('palettes').first();
      const { id } = expectedPalette;
      const response = await request(app).delete(`/api/v1/palettes/${id}`).send(`${id}`);
      const doesExist = await database('palettes').where('id', id);
      expect(response.status).toBe(200);
      expect(response.body).toEqual(`Palette with id ${id} has been removed successfully`)
      expect(doesExist.length).toEqual(0);
    });

    it('should return a 404 with a not found error message if item to delete does not exist', async () => {
      const invalidId = -4;
      const response = await request(app).delete(`/api/v1/palettes/${invalidId}`).send(`${invalidId}`);
      expect(response.status).toBe(404);
      expect(response.body.error).toEqual(`Could not find palette with an id of ${invalidId}`)
    });
  });

  describe('PATCH /api/v1/projects/:id', () => {
    it('should return a 200 with a success message when project name is updated', async () => {
      const correctionBody = { name: 'Updated Project Name' };
      const expectedProject = await database('projects').first();
      const { id } = expectedProject;
      const response = await request(app).patch(`/api/v1/projects/${id}`).send(correctionBody);
      const updatedProject = await database('projects').where('id', id);
      expect(response.status).toBe(200);
      expect(response.body.id).toEqual(id);
      expect(updatedProject[0].name).toEqual(correctionBody.name);
    });

    it('should return a 404 with a not found error message if item to update does not exist', async () => {
      const correctionBody = { name: 'Updated Project Name' };
      const invalidId = -6;
      const response = await request(app).patch(`/api/v1/projects/${invalidId}`).send(correctionBody);
      expect(response.status).toBe(404);
      expect(response.body.error).toEqual(`Could not find project with an id of ${invalidId}`);
    });

    it('should return a 422 with an error message if info to update is invalid property', async () => {
      const correctionBody = { id: 'Updated Project Name' };
      const expectedProject = await database('projects').first();
      const { id } = expectedProject;
      const response = await request(app).patch(`/api/v1/projects/${id}`).send(correctionBody);
      expect(response.status).toBe(422);
      expect(response.body.error).toEqual('Expected body format is: { name: <String> }. You must send only the required "name" property.');
    });
  });

  describe('PATCH /api/v1/palettes/:id', () => {
    it('should return a 200 with a success message when palette name is updated', async () => {
      const correctionBody = { name: 'New and improved palette name' };
      const expectedPalette = await database('palettes').first();
      const { id } = expectedPalette;
      const response = await request(app).patch(`/api/v1/palettes/${id}`).send(correctionBody);
      const updatedPalette = await database('palettes').where('id', id);
      expect(response.status).toBe(200);
      expect(response.body.id).toEqual(id);
      expect(updatedPalette[0].name).toEqual(correctionBody.name);
    });

    it('should return a 404 with a not found message if palette to update does not exist', async () => {
      const correctionBody = { name: 'New and improved palette name' };
      const invalidId = -7;
      const response = await request(app).patch(`/api/v1/palettes/${invalidId}`).send(correctionBody);
      expect(response.status).toBe(404);
      expect(response.body.error).toEqual(`Could not find palette with an id of ${invalidId}`);
    });

    it('should return a 422 with an error message if info to update is invalid property', async () => {
      const correctionBody = { color_one: 'New and improved palette name' };
      const expectedPalette = await database('palettes').first();
      const { id } = expectedPalette;
      const response = await request(app).patch(`/api/v1/palettes/${id}`).send(correctionBody);
      expect(response.status).toBe(422);
      expect(response.body.error).toEqual('Expected body format is: { name: <String> }. You must send only the required "name" property.');
    });
  });

  describe('GET /api/v1/palettes with color query option', () => {
      it('should return a 200 with all palettes if no color is queried', async() => {
        const expectedPalettes = await database('palettes').select();
        const response = await request(app).get('/api/v1/palettes');
        const palettes = response.body;
        expect(response.status).toBe(200);
        expect(palettes.palettes[0].name).toEqual(expectedPalettes[0].name);
        expect(palettes.palettes[palettes.palettes.length-1].name).toEqual(expectedPalettes[expectedPalettes.length-1].name);
      });

      it('should return a 200 with all palettes that include the queried hex code', async () => {
        // Set up DB with two palettes that meet query
        const whitePaletteOne = {
          name: 'new palette one',
          color_one: '#111111',
          color_two: '#FFFFFF',
          color_three: '#333333',
          color_four: '#444444',
          color_five: '#555555'
        };
        const whitePaletteTwo = {
          name: 'new palette two',
          color_one: '#111111',
          color_two: '#222222',
          color_three: '#333333',
          color_four: '#444444',
          color_five: '#FFFFFF'
        };
        const expectedProject = await database('projects').first();
        const { id } = expectedProject;
        const postOne = await request(app).post(`/api/v1/projects/${id}/palettes`).send(whitePaletteOne);
        const postTwo = await request(app).post(`/api/v1/projects/${id}/palettes`).send(whitePaletteTwo);
        const colorQuery = '?color=FFFFFF';
        const expectedResponse = { palettes: [
          {
            name: 'new palette one',
            color_one: '#111111',
            color_two: '#FFFFFF',
            color_three: '#333333',
            color_four: '#444444',
            color_five: '#555555',
            project_id: `${id}`
          },
          {
            name: 'new palette two',
            color_one: '#111111',
            color_two: '#222222',
            color_three: '#333333',
            color_four: '#444444',
            color_five: '#FFFFFF',
            project_id: `${id}`
          }
        ]};
        const response = await request(app).get(`/api/v1/palettes${colorQuery}`);
        const queriedPalettes = response.body;
        expect(response.status).toBe(200);
        expect(queriedPalettes.palettes[0].name).toEqual(expectedResponse.palettes[0].name);
        expect(queriedPalettes.palettes[1].name).toEqual(expectedResponse.palettes[1].name);
      });

      it('should return a 422 with error message if color query is not properly formatted', async () => {
        const colorQuery = '?color=EEEEE';
        const response = await request(app).get(`/api/v1/palettes${colorQuery}`);
        expect(response.status).toBe(422);
        expect(response.body.error).toEqual('Expected query format is: "?color=" + <6 character hex code>.  Do not include "#" before the hex characters.')
      });
  });

});
