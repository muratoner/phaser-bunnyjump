import Phaser from '../lib/phaser.js'
import Carrot from '../game/Carrot.js'

export default class Game extends Phaser.Scene {

    /** @type {Phaser.Physics.Arcade.StaticGroup} */
    platforms

    /** @type {Phaser.Physics.Arcade.Sprite} */
    player

    /** @type {Phaser.Types.Input.Keyboard.CursorKeys} */
    cursors

    /** @type {Phaser.Physics.Arcade.Group} */
    carrots

    /** @type {Phaser.GameObjects.Text} */
    carrotsCollectedText

    carrotsCollected = 0

    constructor() {
        super('game')
    }

    init() {
        this.carrotsCollected = 0
    }


    preload() {
        this.load.image('background', 'src/assets/bg_layer1.png')
        this.load.image('platform', 'src/assets/ground_grass.png')
        this.load.image('bunny-stand', 'src/assets/bunny1_stand.png')
        this.load.image('carrot', 'src/assets/carrot.png')
        this.load.image('bunny-jump', 'src/assets/bunny1_jump.png')
        this.load.audio('jump', 'src/assets/sfx/phaseJump1.ogg')

        this.cursors = this.input.keyboard.createCursorKeys()
    }

    create() {
        this.add.image(240, 320, 'background')
            .setScrollFactor(1, 0)

        const style = {color: '#000', fontSize: 24}
        this.carrotsCollectedText = this.add.text(240, 10, 'Carrots: 0', style)
            .setScrollFactor(0)
            .setOrigin(0.5, 0)


        this.carrots = this.physics.add.group({
            classType: Carrot
        })

        this.carrots.get(240, 320, 'carrot')

        this.player = this.physics.add.sprite(240, 320, 'bunny-stand')
            .setScale(0.5)

        this.player.body.checkCollision.up = false
        this.player.body.checkCollision.left = false
        this.player.body.checkCollision.right = false

        // create the group
        this.platforms = this.physics.add.staticGroup()
        // then create 5 platforms from the group
        for (let i = 0; i < 5; ++i) {
            const x = Phaser.Math.Between(80, 400)
            const y = 145 * i

            const platform = this.platforms.create(x, y, 'platform')
            platform.scale = 0.5

            const body = platform.body
            body.updateFromGameObject()
        }

        this.physics.add.collider(this.platforms, this.player)
        this.physics.add.collider(this.platforms, this.carrots)
        // formatted this way to make it easier to read
        this.physics.add.overlap(
            this.player,
            this.carrots,
            this.handleCollectCarrot, // called on overlap
            undefined,
            this
        )

        this.cameras.main.startFollow(this.player)

        // set the horizontal dead zone to 1.5x game width
        this.cameras.main.setDeadzone(this.scale.width * 1.5)
    }

    findBottomMostPlatform() {
        const platforms = this.platforms.getChildren()
        let bottomPlatform = platforms[0]
        for (let i = 1; i < platforms.length; ++i) {
            const platform = platforms[i]
// discard any platforms that are above current
            if (platform.y < bottomPlatform.y) {
                continue
            }
            bottomPlatform = platform
        }
        return bottomPlatform
    }

    /**
     * @param {Phaser.GameObjects.Sprite} sprite
     */
    addCarrotAbove(sprite) {
        const y = sprite.y - sprite.displayHeight

        /** @type {Phaser.Physics.Arcade.Sprite} */
        const carrot = this.carrots.get(sprite.x, y, 'carrot')

        // set active and visible
        carrot.setActive(true)
        carrot.setVisible(true)

        this.add.existing(carrot)

        carrot.body.setSize(carrot.width, carrot.height)

        // make sure body is enabed in the physics world
        this.physics.world.enable(carrot)

        return carrot
    }

    /**
     * @param {Phaser.Physics.Arcade.Sprite} player
     * @param {Carrot} carrot
     */
    handleCollectCarrot(player, carrot) {
        // hide from display
        this.carrots.killAndHide(carrot)
        // disable from physics world
        this.physics.world.disableBody(carrot.body)
        // increment by 1
        this.carrotsCollected++

        // create new text value and set it
        const value = `Carrots: ${this.carrotsCollected}`
        this.carrotsCollectedText.text = value
    }


    /**
     * @param {Phaser.GameObjects.Sprite} sprite
     */
    horizontalWrap(sprite) {
        const halfWidth = sprite.displayWidth * 0.5
        const gameWidth = this.scale.width
        if (sprite.x < -halfWidth) {
            sprite.x = gameWidth + halfWidth
        } else if (sprite.x > gameWidth + halfWidth) {
            sprite.x = -halfWidth
        }
    }

    update(t, dt) {
        this.platforms.children.iterate(child => {
            /** @type {Phaser.Physics.Arcade.Sprite} */
            const platform = child
            const scrollY = this.cameras.main.scrollY
            if (platform.y >= scrollY + 700) {
                platform.y = scrollY - Phaser.Math.Between(50, 100)
                platform.body.updateFromGameObject()
                // create a carrot above the platform being reused
                this.addCarrotAbove(platform)
            }
        })

        const bottomPlatform = this.findBottomMostPlatform()
        if (this.player.y > bottomPlatform.y + 200) {
            this.scene.start('game-over')
        }

        const touchingDown = this.player.body.touching.down
        if (touchingDown) {
            this.player.setVelocityY(-300)
            // switch to jump texture
            this.player.setTexture('bunny-jump')
            // play jump sound
            this.sound.play('jump')
        }

        const vy = this.player.body.velocity.y
        if (vy > 0 && this.player.texture.key !== 'bunny-stand') {
            // switch back to jump when falling
            this.player.setTexture('bunny-stand')
        }

        // left and right input logic
        if (this.cursors.left.isDown && !touchingDown) {
            this.player.setVelocityX(-200)
        } else if (this.cursors.right.isDown && !touchingDown) {
            this.player.setVelocityX(200)
        } else {
            // stop movement if not left or right
            this.player.setVelocityX(0)
        }

        this.platforms.children.iterate(child => {
            /** @type {Phaser.Physics.Arcade.Sprite} */
            const platform = child
            const scrollY = this.cameras.main.scrollY
            if (platform.y >= scrollY + 700) {
                platform.y = scrollY - Phaser.Math.Between(50, 100)
                platform.body.updateFromGameObject()
            }
        })

        this.horizontalWrap(this.player)
    }
}
